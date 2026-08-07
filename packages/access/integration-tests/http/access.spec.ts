import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createCustomerAccountWorkflow, createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import {
	authorize,
	configureAccessNamespace,
	declareRestrictedFields,
	defineScope,
	defineTenancy,
	hasPermission,
	hasScope,
	requirePolicies,
	resolveActorRoles,
	resolvePermissions
} from '../../src/utils'
import {
	bootstrapSuperAdminWorkflow,
	createAccessPoliciesWorkflow,
	createAccessRolePoliciesWorkflow,
	createAccessRolesWorkflow,
	deleteAccessRolesWorkflow
} from '../../.medusa/server/src/workflows/access/workflows'
import { assignUserRolesWorkflow, removeUserRolesWorkflow } from '../../.medusa/server/src/workflows/user/workflows'
import {
	AdminAccessMePermissionsResponseSchema,
	AdminAccessPolicyResponseSchema,
	AdminAccessPolicyRolesResponseSchema,
	AdminAccessPoliciesResponseSchema,
	AdminAccessRoleResponseSchema,
	AdminAccessRolePoliciesResponseSchema,
	AdminAccessRoleUsersResponseSchema,
	AdminAccessRolesResponseSchema,
	AdminAddRolePoliciesResponseSchema,
	AdminAssignRoleUsersResponseSchema,
	AdminAssignUserRolesResponseSchema
} from './response-contracts'

jest.setTimeout(120 * 1000)

// Deliberately NO `jest.retryTimes`, unlike every other integration spec in this
// repo. A retry re-runs the whole beforeAll, so the failure you are shown is the
// second attempt's — usually an artifact of the first attempt's side effects
// rather than the real defect. Worse, for an authorization suite it converts an
// intermittent denial-or-admission failure into a green run, which is the one
// class of flake that must never be swallowed here. Verified stable across
// repeated runs without it; if that changes, fix the flake rather than hide it.

medusaIntegrationTestRunner({
	dbName: 'medusa-access',
	inApp: true,
	env: {},
	testSuite: ({ getContainer, dbUtils, utils, api }) => {
		// Grant a role through an assignment row — the assignment-model successor
		// of the old actor↔role link-create.
		const assignRole = async (granteeType: string, granteeId: string, roleId: string) => {
			const accessService: any = getContainer().resolve('access')
			await accessService.createAccessRoleAssignments({ role_id: roleId, grantee_type: granteeType, grantee_id: granteeId })
		}

		const assignedRoleIds = async (granteeType: string, granteeId: string): Promise<string[]> => {
			const accessService: any = getContainer().resolve('access')
			const rows = await accessService.listAccessRoleAssignments({ grantee_type: granteeType, grantee_id: granteeId })
			return rows.map((row: any) => row.role_id)
		}

		// Register + create an admin user, optionally grant the seeded super-admin
		// role (via an assignment), and log in. Returns the user id + bearer token.
		const setupAdmin = async (email: string, opts?: { superAdmin?: boolean }): Promise<{ userId: string; token: string }> => {
			const container = getContainer()
			const authService: any = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email, password: 'Sup3rSecret!' }
			})
			const { result: user } = await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: { email, first_name: 'Test', last_name: 'Admin' }
				}
			})
			if (opts?.superAdmin) {
				await assignRole('user', user.id, 'acrl_super_admin')
			}
			const login = await api.post('/auth/user/emailpass', {
				email,
				password: 'Sup3rSecret!'
			})
			return { userId: user.id, token: login.data.token }
		}

		// Runs FIRST, on clean boot state (no role assignments yet), so the
		// bootstrap's "first load" precondition holds before other describes create
		// super-admin assignments into the DB template.
		describe('super-admin bootstrap', () => {
			it('grants super-admin to a role-less user and is idempotent', async () => {
				const container = getContainer()
				const authService: any = container.resolve(Modules.AUTH)
				const { authIdentity } = await authService.register('emailpass', {
					body: { email: 'bootstrap@example.com', password: 'Sup3rSecret!' }
				})
				const { result: user } = await createUserAccountWorkflow(container).run({
					input: {
						authIdentityId: authIdentity!.id,
						userData: {
							email: 'bootstrap@example.com',
							first_name: 'Boot',
							last_name: 'Strap'
						}
					}
				})
				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()

				const rolesOf = () => assignedRoleIds('user', user.id)

				expect(await rolesOf()).not.toContain('acrl_super_admin')

				// The bootstrap is a one-time grant: it skips the moment ANY role
				// assignment exists anywhere. Every later describe creates one, so this
				// block is only correct in first position — and without this check a
				// reorder fails on the assertion below with "expected acrl_super_admin",
				// which points at the workflow rather than at the ordering.
				const accessService: any = container.resolve('access')
				const existingAssignments = await accessService.listAccessRoleAssignments({})
				if (existingAssignments.length) {
					throw new Error(
						'super-admin bootstrap must be the FIRST describe in this file: the workflow skips once any role assignment exists, and an earlier block has already created one.'
					)
				}

				await bootstrapSuperAdminWorkflow(container).run({})
				expect(await rolesOf()).toContain('acrl_super_admin')

				// idempotent: running again does not add a duplicate
				await bootstrapSuperAdminWorkflow(container).run({})
				const roles = await rolesOf()
				expect(roles.filter((r: string) => r === 'acrl_super_admin')).toHaveLength(1)
			})
		})

		describe('role assignments', () => {
			it('assigns a role to a user and resolves it via graph query', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const query = container.resolve(ContainerRegistrationKeys.QUERY)

				// 1) create an access role
				const role = await accessService.createAccessRoles({ name: 'Manager' })

				// 2) create a user
				const authService: any = container.resolve(Modules.AUTH)
				const { authIdentity } = await authService.register('emailpass', {
					body: { email: 'link-test@example.com', password: 'Sup3rSecret!' }
				})
				const { result: user } = await createUserAccountWorkflow(container).run({
					input: {
						authIdentityId: authIdentity!.id,
						userData: {
							email: 'link-test@example.com',
							first_name: 'Link',
							last_name: 'Tester'
						}
					}
				})

				// 3) create the assignment (user holds access_role)
				await assignRole('user', user.id, role.id)

				// 4) resolve the assignment back via graph, role relation included
				const { data } = await (query as any).graph({
					entity: 'access_role_assignment',
					fields: ['role_id', 'role.name'],
					filters: { grantee_type: 'user', grantee_id: user.id }
				})

				expect(data).toHaveLength(1)
				expect(data[0].role_id).toBe(role.id)
				expect(data[0].role?.name).toBe('Manager')
			})
		})

		describe('hasPermission', () => {
			it('grants exact actions, denies others', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				const role = await accessService.createAccessRoles({
					name: 'WidgetReader'
				})
				const policy = await accessService.createAccessPolicies({
					key: 'widget2:read',
					resource: 'widget2',
					operation: 'read',
					name: 'ReadWidget2'
				})
				await accessService.createAccessRolePolicies({
					role_id: role.id,
					policy_id: policy.id
				})

				await expect(
					hasPermission({
						roles: [role.id],
						actions: { resource: 'widget2', operation: 'read' },
						container
					})
				).resolves.toBe(true)

				await expect(
					hasPermission({
						roles: [role.id],
						actions: { resource: 'widget2', operation: 'delete' },
						container
					})
				).resolves.toBe(false)
			})

			it('resolves each role once per request scope, collapsing concurrent lookups', async () => {
				const { asValue } = require('awilix')
				const { markRequestScope } = require('../../src/utils/has-permission') as typeof import('../../src/utils/has-permission')

				const scope = (getContainer() as any).createScope()
				const real = scope.resolve(ContainerRegistrationKeys.QUERY)
				let graphCalls = 0
				scope.register(
					ContainerRegistrationKeys.QUERY,
					asValue({
						...real,
						graph: (...args: any[]) => {
							graphCalls++
							return (real as any).graph(...args)
						}
					})
				)
				markRequestScope(scope)

				const check = () =>
					hasPermission({
						roles: ['acrl_super_admin'],
						actions: { resource: 'order', operation: 'read' },
						container: scope
					})

				// Concurrent, as the field filter issues them: without in-flight
				// memoization each would start its own query.
				await Promise.all([check(), check(), check()])
				expect(graphCalls).toBe(1)

				// And a later sequential call within the same request reuses it.
				await check()
				expect(graphCalls).toBe(1)
			})

			it('does not memoize on an unmarked (non-request) container', async () => {
				const { asValue } = require('awilix')

				const scope = (getContainer() as any).createScope()
				const real = scope.resolve(ContainerRegistrationKeys.QUERY)
				let graphCalls = 0
				scope.register(
					ContainerRegistrationKeys.QUERY,
					asValue({
						...real,
						graph: (...args: any[]) => {
							graphCalls++
							return (real as any).graph(...args)
						}
					})
				)

				// Unmarked: jobs, subscribers and CLI callers get the root container,
				// where memoizing would be an unbounded process-lifetime cache.
				const check = () =>
					hasPermission({
						roles: ['acrl_super_admin'],
						actions: { resource: 'order', operation: 'read' },
						container: scope
					})

				await check()
				await check()
				expect(graphCalls).toBe(2)
			})

			it('super admin (*:*) grants everything; resolvePermissions expands the universe', async () => {
				const container = getContainer()

				// the module's initial-data loader seeds acrl_super_admin with a *:* policy
				await expect(
					hasPermission({
						roles: ['acrl_super_admin'],
						actions: { resource: 'order', operation: 'delete' },
						container
					})
				).resolves.toBe(true)

				const granted = await resolvePermissions({
					roles: ['acrl_super_admin'],
					universe: [
						{ resource: 'order', operation: 'delete' },
						{ resource: 'product', operation: 'read' }
					],
					container
				})
				// A *:* grant is unrestricted, so neither entry carries a `scope`.
				expect(granted).toEqual(
					expect.arrayContaining([
						{ resource: 'order', operation: 'delete' },
						{ resource: 'product', operation: 'read' }
					])
				)
			})
		})

		describe('rbac CRUD workflows', () => {
			it('creates policies + a role linked to them, then deletes the role', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				const { result: createdPolicies } = await createAccessPoliciesWorkflow(container).run({
					input: {
						policies: [
							{
								key: 'widget:read',
								resource: 'widget',
								operation: 'read',
								name: 'ReadWidget'
							}
						]
					}
				})
				const policyId = createdPolicies[0].id

				expect(policyId).toBeTruthy()

				// bare role create (no nested policy linking) to isolate transaction behavior
				const { result: createdRoles } = await createAccessRolesWorkflow(container).run({
					input: { roles: [{ name: 'WidgetViewer' }] }
				})
				const roleId = createdRoles[0].id
				expect(roleId).toBeTruthy()

				const [beforeDelete] = await accessService.listAccessRoles({
					id: roleId
				})
				expect(beforeDelete?.name).toBe('WidgetViewer')

				await deleteAccessRolesWorkflow(container).run({
					input: { ids: [roleId] }
				})
				const after = await accessService.listAccessRoles({ id: roleId })
				expect(after).toHaveLength(0)
			})

			it('nested: creates a role WITH policies in one workflow call', async () => {
				// The 2.17 DB-templating restore can leave workflow steps on divergent
				// connections (write-step vs read-step see different DB state); re-capturing
				// the template stabilizes the connection for this test. See memory:
				// project_test_utils_pk_seeding.
				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()

				const container = getContainer()
				const accessService: any = container.resolve('access')

				const { result: createdPolicies } = await createAccessPoliciesWorkflow(container).run({
					input: {
						policies: [
							{
								key: 'gizmo:read',
								resource: 'gizmo',
								operation: 'read',
								name: 'ReadGizmo'
							}
						]
					}
				})

				const { result: createdRoles } = await createAccessRolesWorkflow(container).run({
					input: {
						roles: [{ name: 'GizmoViewer', policy_ids: [createdPolicies[0].id] }]
					}
				})

				const rolePolicies = await accessService.listPoliciesForRole(createdRoles[0].id)
				expect(rolePolicies.map((p: any) => p.key)).toContain('gizmo:read')
			})

			it('links a policy to a pre-existing role via the role-policies workflow', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				const role = await accessService.createAccessRoles({ name: 'Linker' })
				const policy = await accessService.createAccessPolicies({
					key: 'gadget:read',
					resource: 'gadget',
					operation: 'read',
					name: 'ReadGadget'
				})

				await createAccessRolePoliciesWorkflow(container).run({
					input: { policies: [{ role_id: role.id, policy_id: policy.id }] }
				})

				const rolePolicies = await accessService.listPoliciesForRole(role.id)
				expect(rolePolicies.map((p: any) => p.key)).toContain('gadget:read')
			})
		})

		describe('user role assignment workflows', () => {
			it('assigns then removes a role on a user', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const query = container.resolve(ContainerRegistrationKeys.QUERY)

				// --- setup (seed) on a stable connection ---
				const authService: any = container.resolve(Modules.AUTH)
				const { authIdentity } = await authService.register('emailpass', {
					body: { email: 'assign-test@example.com', password: 'Sup3rSecret!' }
				})
				const { result: user } = await createUserAccountWorkflow(container).run({
					input: {
						authIdentityId: authIdentity!.id,
						userData: {
							email: 'assign-test@example.com',
							first_name: 'Assign',
							last_name: 'Tester'
						}
					}
				})

				// policy-less role => validate-user-role-permissions short-circuits
				const role = await accessService.createAccessRoles({
					name: 'NoPolicyRole'
				})

				// stabilize the template AFTER seeding, before the create-then-read workflows
				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()

				await assignUserRolesWorkflow(container).run({
					input: { actor_id: user.id, user_id: user.id, role_id: role.id }
				})
				expect(await assignedRoleIds('user', user.id)).toContain(role.id)

				await removeUserRolesWorkflow(container).run({
					input: { actor_id: user.id, user_id: user.id, role_id: role.id }
				})
				expect(await assignedRoleIds('user', user.id)).not.toContain(role.id)
			})
		})

		describe('roles routes', () => {
			let token: string
			let adminUserId: string
			beforeAll(async () => {
				const admin = await setupAdmin('admin-roles@example.com', {
					superAdmin: true
				})
				token = admin.token
				adminUserId = admin.userId
				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			const auth = () => ({ headers: { Authorization: `Bearer ${token}` } })

			it('creates, lists, and retrieves a role', async () => {
				const created = await api.post('/admin/access/roles', { name: 'RouteRole' }, auth())
				expect(created.status).toBe(200)
				expect(created.data.role.name).toBe('RouteRole')
				// verifies: AdminAccessRoleResponse (POST /admin/access/roles)
				expect(() => AdminAccessRoleResponseSchema.parse(created.data)).not.toThrow()

				const listed = await api.get('/admin/access/roles', auth())
				expect(listed.status).toBe(200)
				expect(listed.data.roles.map((r: any) => r.name)).toContain('RouteRole')
				// verifies: AdminAccessRolesResponse (GET /admin/access/roles)
				expect(() => AdminAccessRolesResponseSchema.parse(listed.data)).not.toThrow()

				const one = await api.get(`/admin/access/roles/${created.data.role.id}`, auth())
				expect(one.status).toBe(200)
				expect(one.data.role.id).toBe(created.data.role.id)
				// verifies: AdminAccessRoleResponse (GET /admin/access/roles/:id)
				expect(() => AdminAccessRoleResponseSchema.parse(one.data)).not.toThrow()
			})

			it('creates a role with parent_ids and inherits the parent policies', async () => {
				const parentPolicy = await api.post(
					'/admin/access/policies',
					{ key: 'inherit_probe:read', resource: 'inherit_probe', operation: 'read', name: 'InheritProbeRead' },
					auth()
				)
				const parentPolicyId = parentPolicy.data.policy.id

				const parent = await api.post('/admin/access/roles', { name: 'ParentRole', policy_ids: [parentPolicyId] }, auth())
				expect(parent.status).toBe(200)
				const parentId = parent.data.role.id

				// parent_ids is the field the workflows read; it was previously declared as
				// singular `parent_id` in the validator and silently dropped.
				const child = await api.post('/admin/access/roles', { name: 'ChildRole', parent_ids: [parentId] }, auth())
				expect(child.status).toBe(200)

				// The /policies route lists DIRECT links only (it filters access_role_policy by
				// role_id), so inheritance is asserted through the resolution path that actually
				// gates requests — hasPermission, which goes via the recursive CTE.
				await expect(
					hasPermission({
						roles: [child.data.role.id],
						actions: { resource: 'inherit_probe', operation: 'read' },
						container: getContainer()
					})
				).resolves.toBe(true)
			})

			it('rejects a role that would be its own parent', async () => {
				const role = await api.post('/admin/access/roles', { name: 'SelfParentRole' }, auth())
				const roleId = role.data.role.id

				const res = await api.post(`/admin/access/roles/${roleId}`, { parent_ids: [roleId] }, auth()).catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('attaches a policy and assigns a user to a role, and both link routes reflect it', async () => {
				const roleRes = await api.post('/admin/access/roles', { name: 'DebugRole' }, auth())
				const roleId = roleRes.data.role.id
				const policyRes = await api.post('/admin/access/policies', { key: 'debug:read', resource: 'debug', operation: 'read', name: 'DebugRead' }, auth())
				const policyId = policyRes.data.policy.id

				const addPolicy = await api.post(`/admin/access/roles/${roleId}/policies`, { policies: [policyId] }, auth())
				expect(addPolicy.data.policies[0].policy).toBe('debug:read')
				// verifies: AdminAddRolePoliciesResponse (POST /admin/access/roles/:id/policies)
				expect(() => AdminAddRolePoliciesResponseSchema.parse(addPolicy.data)).not.toThrow()

				const rpGet = await api.get(`/admin/access/roles/${roleId}/policies`, auth())
				expect(rpGet.data.policies[0].policy).toBe('debug:read')
				// verifies: AdminAccessRolePoliciesResponse (GET /admin/access/roles/:id/policies)
				expect(() => AdminAccessRolePoliciesResponseSchema.parse(rpGet.data)).not.toThrow()

				const assignUser = await api.post(`/admin/access/roles/${roleId}/users`, { users: [adminUserId] }, auth())
				expect(assignUser.data.users.map((u: any) => u.id)).toContain(adminUserId)
				// verifies: AdminAssignRoleUsersResponse (POST /admin/access/roles/:id/users)
				expect(() => AdminAssignRoleUsersResponseSchema.parse(assignUser.data)).not.toThrow()

				const usersGet = await api.get(`/admin/access/roles/${roleId}/users`, auth())
				expect(usersGet.data.users.map((u: any) => u.id)).toContain(adminUserId)
				// verifies: AdminAccessRoleUsersResponse (GET /admin/access/roles/:id/users)
				expect(() => AdminAccessRoleUsersResponseSchema.parse(usersGet.data)).not.toThrow()

				const rolesForPolicy = await api.get(`/admin/access/policies/${policyId}/roles`, auth())
				expect(rolesForPolicy.data.roles.map((r: any) => r.id)).toContain(roleId)
				// verifies: AdminAccessPolicyRolesResponse (GET /admin/access/policies/:id/roles)
				expect(() => AdminAccessPolicyRolesResponseSchema.parse(rolesForPolicy.data)).not.toThrow()
			})

			it('creates, lists, and retrieves a policy', async () => {
				const created = await api.post(
					'/admin/access/policies',
					{
						key: 'thing:read',
						resource: 'thing',
						operation: 'read',
						name: 'ReadThing'
					},
					auth()
				)
				expect(created.status).toBe(200)
				expect(created.data.policy.key).toBe('thing:read')
				// verifies: AdminAccessPolicyResponse (POST /admin/access/policies)
				expect(() => AdminAccessPolicyResponseSchema.parse(created.data)).not.toThrow()

				const listed = await api.get('/admin/access/policies?limit=1000', auth())
				expect(listed.status).toBe(200)
				expect(listed.data.policies.map((p: any) => p.key)).toContain('thing:read')
				// verifies: AdminAccessPoliciesResponse (GET /admin/access/policies)
				expect(() => AdminAccessPoliciesResponseSchema.parse(listed.data)).not.toThrow()

				const one = await api.get(`/admin/access/policies/${created.data.policy.id}`, auth())
				expect(one.status).toBe(200)
				expect(one.data.policy.id).toBe(created.data.policy.id)
				// verifies: AdminAccessPolicyResponse (GET /admin/access/policies/:id)
				expect(() => AdminAccessPolicyResponseSchema.parse(one.data)).not.toThrow()

				const rolesForPolicy = await api.get(`/admin/access/policies/${created.data.policy.id}/roles`, auth())
				expect(rolesForPolicy.status).toBe(200)
				// verifies: AdminAccessPolicyRolesResponse (GET /admin/access/policies/:id/roles, empty case)
				expect(() => AdminAccessPolicyRolesResponseSchema.parse(rolesForPolicy.data)).not.toThrow()
			})
		})

		describe('scoped role-policy assignment route', () => {
			let token: string
			beforeAll(async () => {
				const admin = await setupAdmin('admin-scoped-policy-route@example.com', { superAdmin: true })
				token = admin.token

				// Scope registration is global and this describe must not depend on
				// which one ran first — `defineScope` throws on a duplicate.
				if (!hasScope('customer', 'company')) {
					defineScope({ name: 'company', resource: 'customer', filter: async () => ({}) })
				}

				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			const auth = () => ({ headers: { Authorization: `Bearer ${token}` } })

			it('round-trips a scope on a role-policy assignment', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const [customerDeletePolicy] = await accessService.listAccessPolicies({ key: 'customer:delete' })

				const roleRes = await api.post('/admin/access/roles', { name: 'ScopedPolicyRole' }, auth())
				const roleId = roleRes.data.role.id

				const addPolicy = await api.post(
					`/admin/access/roles/${roleId}/policies`,
					{ policies: [{ id: customerDeletePolicy.id, scope: 'company' }] },
					auth()
				)
				expect(addPolicy.status).toBe(200)
				expect(addPolicy.data.policies[0].scope).toBe('company')
				// verifies: AdminAddRolePoliciesResponse (POST /admin/access/roles/:id/policies, scoped)
				expect(() => AdminAddRolePoliciesResponseSchema.parse(addPolicy.data)).not.toThrow()

				const rpGet = await api.get(`/admin/access/roles/${roleId}/policies`, auth())
				const row = rpGet.data.policies.find((p: any) => p.policy_id === customerDeletePolicy.id)
				expect(row.scope).toBe('company')
				// verifies: AdminAccessRolePoliciesResponse (GET /admin/access/roles/:id/policies, scoped)
				expect(() => AdminAccessRolePoliciesResponseSchema.parse(rpGet.data)).not.toThrow()
			})

			it('still accepts a bare policy id (unrestricted assignment) alongside the scoped shape', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const [customerReadPolicy] = await accessService.listAccessPolicies({ key: 'customer:read' })

				const roleRes = await api.post('/admin/access/roles', { name: 'UnrestrictedPolicyRole' }, auth())
				const roleId = roleRes.data.role.id

				const addPolicy = await api.post(`/admin/access/roles/${roleId}/policies`, { policies: [customerReadPolicy.id] }, auth())
				expect(addPolicy.status).toBe(200)
				expect(addPolicy.data.policies[0].scope ?? null).toBeNull()
			})

			it('rejects a scope on a wildcard policy', async () => {
				const wildcardPolicy = await api.post(
					'/admin/access/policies',
					{ key: 'wildcard_probe:*', resource: 'wildcard_probe', operation: '*', name: 'WildcardProbe' },
					auth()
				)

				const roleRes = await api.post('/admin/access/roles', { name: 'WildcardScopeRole' }, auth())
				const roleId = roleRes.data.role.id

				const res = await api
					.post(`/admin/access/roles/${roleId}/policies`, { policies: [{ id: wildcardPolicy.data.policy.id, scope: 'company' }] }, auth())
					.catch((e: any) => e.response)

				expect(res.status).toBe(400)
				expect(res.data.message).toMatch(/wildcard/i)
			})

			it('rejects a scope with no registered defineScope entry for the resource', async () => {
				const policyRes = await api.post(
					'/admin/access/policies',
					{ key: 'unscoped_probe:read', resource: 'unscoped_probe', operation: 'read', name: 'UnscopedProbeRead' },
					auth()
				)

				const roleRes = await api.post('/admin/access/roles', { name: 'UnregisteredScopeRole' }, auth())
				const roleId = roleRes.data.role.id

				const res = await api
					.post(`/admin/access/roles/${roleId}/policies`, { policies: [{ id: policyRes.data.policy.id, scope: 'nonexistent_scope' }] }, auth())
					.catch((e: any) => e.response)

				expect(res.status).toBe(400)
				expect(res.data.message).toMatch(/not.*registered|no scope/i)
			})

			// The unique index on `access_role_policy` is `(role_id, policy_id)` --
			// it has no `scope` column -- so two entries for the same policy in one
			// request (here: unscoped + `@company`) can never both be inserted.
			// Without `validateRolePolicyScopesStep`'s duplicate check this would
			// hit the DB constraint directly instead of failing cleanly. Changing
			// an existing assignment's scope is a separate route --
			// `POST /admin/access/roles/:id/policies/:policy_id` -- exercised in
			// the `role-policy admin API` describe below.
			it('rejects the same policy id assigned more than once in one request', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const [customerDeletePolicy] = await accessService.listAccessPolicies({ key: 'customer:delete' })

				const roleRes = await api.post('/admin/access/roles', { name: 'DuplicatePolicyRole' }, auth())
				const roleId = roleRes.data.role.id

				const res = await api
					.post(
						`/admin/access/roles/${roleId}/policies`,
						{ policies: [{ id: customerDeletePolicy.id }, { id: customerDeletePolicy.id, scope: 'company' }] },
						auth()
					)
					.catch((e: any) => e.response)

				expect(res.status).toBe(400)
				expect(res.data.message).toMatch(/more than once/i)
			})
		})

		describe('me/permissions + user-roles routes', () => {
			let token: string
			let adminUserId: string
			beforeAll(async () => {
				const admin = await setupAdmin('admin-5c@example.com', {
					superAdmin: true
				})
				token = admin.token
				adminUserId = admin.userId
				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			const auth = () => ({ headers: { Authorization: `Bearer ${token}` } })

			it('syncs the 14 core policy definitions to access_policy', async () => {
				const res = await api.get('/admin/access/policies?limit=1000', auth())
				expect(res.status).toBe(200)
				const keys = res.data.policies.map((p: any) => p.key)
				expect(keys).toContain('product:read')
				expect(keys).toContain('order:create')
				expect(keys).toContain('access_role:update')
			})

			it('me/permissions reflects synced policies for a super-admin', async () => {
				const res = await api.get('/admin/access/me/permissions', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.permissions)).toBe(true)
				// super-admin (*:*) grants everything in the universe, which now
				// includes the synced core definitions
				expect(res.data.permissions).toContain('product:read')
				// verifies: AdminAccessMePermissionsResponse (GET /admin/access/me/permissions)
				// -- also the contract other plugins' widgets rely on to detect access.
				expect(() => AdminAccessMePermissionsResponseSchema.parse(res.data)).not.toThrow()
			})

			it('assigns, lists, and removes a role on a user via routes', async () => {
				const roleRes = await api.post('/admin/access/roles', { name: 'UserRouteRole' }, auth())
				const roleId = roleRes.data.role.id

				const assign = await api.post(`/admin/users/${adminUserId}/access/roles`, { roles: [roleId] }, auth())
				expect(assign.status).toBe(200)
				expect(assign.data.roles.map((r: any) => r.id)).toContain(roleId)
				// verifies: AdminAssignUserRolesResponse (POST /admin/users/:id/access/roles)
				expect(() => AdminAssignUserRolesResponseSchema.parse(assign.data)).not.toThrow()

				const list = await api.get(`/admin/users/${adminUserId}/access/roles`, auth())
				expect(list.status).toBe(200)
				expect(list.data.roles.map((r: any) => r.id)).toContain(roleId)
				// verifies: AdminAccessRolesResponse (GET /admin/users/:id/access/roles)
				expect(() => AdminAccessRolesResponseSchema.parse(list.data)).not.toThrow()

				const del = await api.delete(`/admin/users/${adminUserId}/access/roles/${roleId}`, auth())
				expect(del.status).toBe(200)

				const listAfter = await api.get(`/admin/users/${adminUserId}/access/roles`, auth())
				expect(listAfter.data.roles.map((r: any) => r.id)).not.toContain(roleId)
			})

			// Assigning a nonexistent role 400s instead (a separate, pre-existing
			// validateRolesExistStep check in assignUserRolesWorkflow catches it
			// first) -- removal has no such step, so this is what pins the
			// narrowed-away/missing-role fail-closed check in
			// validateUserRolePermissionsStep.
			it('404s removing a role id that does not exist', async () => {
				const res = await api.delete(`/admin/users/${adminUserId}/access/roles/acrl_does_not_exist`, auth()).catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})
		})

		describe('enforcement guard', () => {
			let superToken: string
			let plainToken: string
			beforeAll(async () => {
				const superAdmin = await setupAdmin('enf-super@example.com', {
					superAdmin: true
				})
				const plain = await setupAdmin('enf-plain@example.com')
				superToken = superAdmin.token
				plainToken = plain.token
				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			it('allows a super-admin and denies a role-less user', async () => {
				const ok = await api.get('/admin/access/roles', {
					headers: { Authorization: `Bearer ${superToken}` }
				})
				expect(ok.status).toBe(200)

				const denied = await api
					.get('/admin/access/roles', {
						headers: { Authorization: `Bearer ${plainToken}` }
					})
					.catch((e: any) => e.response)
				expect(denied.status).toBe(403)
			})

			it('gates CORE admin routes (full parity) — super-admin allowed, role-less denied', async () => {
				const ok = await api.get('/admin/products?limit=1', {
					headers: { Authorization: `Bearer ${superToken}` }
				})
				expect(ok.status).toBe(200)

				const denied = await api
					.get('/admin/products?limit=1', {
						headers: { Authorization: `Bearer ${plainToken}` }
					})
					.catch((e: any) => e.response)
				expect(denied.status).toBe(403)
			})

			it('an undeclared route passes when unsealed and is denied once its namespace is sealed', async () => {
				const { sealNamespace } = require('medusa-plugin-access') as typeof import('medusa-plugin-access')

				// A path with no route and no policy declaration. The guard is mounted at
				// /*, so it runs before route dispatch — unsealed this falls through
				// to a 404, sealed it is refused outright.
				const probePath = '/admin/seal-probe/thing'
				const asSuper = { headers: { Authorization: `Bearer ${superToken}` } }

				const beforeSeal = await api.get(probePath, asSuper).catch((e: any) => e.response)
				expect(beforeSeal.status).toBe(404)

				sealNamespace('/admin/seal-probe')

				const afterSeal = await api.get(probePath, asSuper).catch((e: any) => e.response)
				expect(afterSeal.status).toBe(403)

				// Segment-boundary matching: a sibling sharing the string prefix is untouched.
				const sibling = await api.get('/admin/seal-probe-other/thing', asSuper).catch((e: any) => e.response)
				expect(sibling.status).toBe(404)
			})
		})

		describe('layered declarations (guardResource floor + stricter override)', () => {
			let floorOnlyToken: string
			let readOnlyToken: string
			let exportOnlyToken: string
			let meReadToken: string
			let meWriteOnlyToken: string

			beforeAll(async () => {
				const container = getContainer()
				const { guardResource, requirePolicies } = require('medusa-plugin-access') as typeof import('medusa-plugin-access')

				// A synthetic resource surface: a guardResource floor, plus a stricter
				// declaration on one sub-path. Nothing routes here — the guard runs at
				// /*, before dispatch, so a pass shows up as 404 and a denial as 403.
				guardResource({ resource: 'layer_probe', prefix: '/admin/layer-probe' })
				requirePolicies({
					method: ['POST'],
					matcher: '/admin/layer-probe/:id/strict*',
					policies: [{ resource: 'layer_strict', operation: 'update' }]
				})
				guardResource({ resource: 'export_probe', prefix: '/admin/export-probe', exports: ['pdf-export'] })

				// A REAL mounted route, gated solely by guardResource.
				// `/admin/access/me/permissions` ships undeclared (fail-open by design),
				// so nothing else requires anything on it — which makes it the one place
				// an admission can be attributed to guardResource and nothing else. The
				// only other actor that touches it in this suite holds `*:*`, so gating
				// it here cannot disturb them.
				guardResource({ resource: 'me_probe', prefix: '/admin/access/me' })

				const accessService: any = container.resolve('access')
				const floorPolicy = await accessService.createAccessPolicies({
					key: 'layer_probe:update',
					resource: 'layer_probe',
					operation: 'update',
					name: 'LayerProbeUpdate'
				})
				const role = await accessService.createAccessRoles({ name: 'LayerFloorOnly' })
				await accessService.createAccessRolePolicies({
					role_id: role.id,
					policy_id: floorPolicy.id
				})

				// Deliberately NOT granted layer_strict:update.
				const limited = await setupAdmin('layer-floor@example.com')
				floorOnlyToken = limited.token
				await assignRole('user', limited.userId, role.id)

				const grant = async (roleName: string, key: string, resource: string, operation: string, email: string) => {
					const [existingPolicy] = await accessService.listAccessPolicies({ key })
					const policy = existingPolicy ?? (await accessService.createAccessPolicies({ key, resource, operation, name: key }))
					const grantRole = await accessService.createAccessRoles({ name: roleName })
					await accessService.createAccessRolePolicies({ role_id: grantRole.id, policy_id: policy.id })
					const actor = await setupAdmin(email)
					await assignRole('user', actor.userId, grantRole.id)
					return actor.token
				}

				// Holds layer_probe:read and nothing else.
				readOnlyToken = await grant('LayerReadOnly', 'layer_probe:read', 'layer_probe', 'read', 'layer-read@example.com')
				// Holds export_probe:export and nothing else -- not export_probe:update,
				// which is what the subtree floor would otherwise demand.
				exportOnlyToken = await grant('ExportProbeExporter', 'export_probe:export', 'export_probe', 'export', 'export-only@example.com')

				meReadToken = await grant('MeProbeReader', 'me_probe:read', 'me_probe', 'read', 'me-probe-read@example.com')
				// Deliberately holds a grant on the same resource at the wrong
				// operation, so the denial below is about the operation and not about
				// having no policies at all.
				meWriteOnlyToken = await grant('MeProbeWriter', 'me_probe:create', 'me_probe', 'create', 'me-probe-write@example.com')

				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			// The real-route proof: a mounted handler behind a guardResource declaration
			// and nothing else. An admission here is a 200 carrying a real body, which
			// is what the synthetic probes below cannot show — a pass through the guard
			// on a path nothing routes to is indistinguishable from a 404.
			it('admits a properly-privileged actor through a guardResource-gated real route', async () => {
				const auth = { headers: { Authorization: `Bearer ${meReadToken}` } }

				const res = await api.get('/admin/access/me/permissions', auth)

				expect(res.status).toBe(200)
				// The handler really ran: this is its response shape, not the guard's.
				expect(Array.isArray(res.data.permissions)).toBe(true)
				expect(res.data.permissions).toContain('me_probe:read')
			})

			it('denies an actor holding the wrong operation on that same real route', async () => {
				// Same resource, same route, one operation off -- so the refusal is
				// attributable to guardResource's method-to-operation mapping rather
				// than to the actor holding nothing.
				const auth = { headers: { Authorization: `Bearer ${meWriteOnlyToken}` } }

				const res = await api.get('/admin/access/me/permissions', auth).catch((e: any) => e.response)

				expect(res.status).toBe(403)
			})

			it('denies an under-privileged actor on a guardResource-declared write, and admits its read', async () => {
				// Synthetic surface: nothing routes under /admin/layer-probe, so a pass
				// shows up as 404 and only the 403s carry information. That is enough
				// for the AND-layering and carve-out cases below, which are about which
				// declaration matches -- the admission half is proven on the real route
				// above instead.
				const auth = { headers: { Authorization: `Bearer ${readOnlyToken}` } }

				const onRead = await api.get('/admin/layer-probe', auth).catch((e: any) => e.response)
				expect(onRead.status).toBe(404)

				const onCreate = await api.post('/admin/layer-probe', {}, auth).catch((e: any) => e.response)
				expect(onCreate.status).toBe(403)

				const onUpdate = await api.post('/admin/layer-probe/lp_1', {}, auth).catch((e: any) => e.response)
				expect(onUpdate.status).toBe(403)

				const onDelete = await api.delete('/admin/layer-probe/lp_1', auth).catch((e: any) => e.response)
				expect(onDelete.status).toBe(403)
			})

			it('requires the export operation on a declared export path instead of the subtree floor', async () => {
				// The floor would demand `export_probe:update` on this POST. The
				// carve-out replaces it, so an actor holding only `export_probe:export`
				// gets through while the same actor is refused elsewhere in the subtree.
				const auth = { headers: { Authorization: `Bearer ${exportOnlyToken}` } }

				const onExport = await api.post('/admin/export-probe/pdf-export', {}, auth).catch((e: any) => e.response)
				expect(onExport.status).toBe(404)

				const onSibling = await api.post('/admin/export-probe/ep_1', {}, auth).catch((e: any) => e.response)
				expect(onSibling.status).toBe(403)

				// Segment-bounded: a sibling sharing the string prefix stays on the floor.
				const onPrefixSibling = await api.post('/admin/export-probe/pdf-export-log', {}, auth).catch((e: any) => e.response)
				expect(onPrefixSibling.status).toBe(403)
			})

			it('satisfying the floor alone is not enough for a route with a stricter declaration', async () => {
				const auth = { headers: { Authorization: `Bearer ${floorOnlyToken}` } }

				// Floor satisfied -> guard passes -> falls through to 404 (no such route).
				const onFloor = await api.post('/admin/layer-probe/lp_1', {}, auth).catch((e: any) => e.response)
				expect(onFloor.status).toBe(404)

				// Same actor, sub-path carrying an extra requirement it does not hold.
				// Matching is AND across declarations, so this must be refused.
				const onStrict = await api.post('/admin/layer-probe/lp_1/strict/s_1', {}, auth).catch((e: any) => e.response)
				expect(onStrict.status).toBe(403)
			})
		})

		describe('field-filter (link-pivot bypass)', () => {
			let superToken: string
			let limitedToken: string
			let customerId: string

			beforeAll(async () => {
				const container = getContainer()
				const superAdmin = await setupAdmin('ff-super@example.com', {
					superAdmin: true
				})
				superToken = superAdmin.token
				const superAuth = {
					headers: { Authorization: `Bearer ${superToken}` }
				}

				// limited user: a role granting customer:read but NOT customer_group:read
				const accessService: any = container.resolve('access')
				const role = await accessService.createAccessRoles({
					name: 'CustomerReader'
				})
				const [custRead] = await accessService.listAccessPolicies({
					key: 'customer:read'
				})
				await accessService.createAccessRolePolicies({
					role_id: role.id,
					policy_id: custRead.id
				})
				const authService: any = container.resolve(Modules.AUTH)
				const { authIdentity } = await authService.register('emailpass', {
					body: { email: 'ff-limited@example.com', password: 'Sup3rSecret!' }
				})
				const { result: user } = await createUserAccountWorkflow(container).run({
					input: {
						authIdentityId: authIdentity!.id,
						userData: {
							email: 'ff-limited@example.com',
							first_name: 'FF',
							last_name: 'Limited'
						}
					}
				})
				await assignRole('user', user.id, role.id)
				const login = await api.post('/auth/user/emailpass', {
					email: 'ff-limited@example.com',
					password: 'Sup3rSecret!'
				})
				limitedToken = login.data.token

				// seed a customer in a group (via the super-admin API)
				const cust = await api.post('/admin/customers', { email: 'ff-cust@example.com', first_name: 'F', last_name: 'C' }, superAuth)
				customerId = cust.data.customer.id
				const grp = await api.post('/admin/customer-groups', { name: 'VIP' }, superAuth)
				await api.post(`/admin/customer-groups/${grp.data.customer_group.id}/customers`, { add: [customerId] }, superAuth)

				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			it('strips customer.groups for a user lacking customer_group:read', async () => {
				const url = `/admin/customers/${customerId}?fields=id,email,groups.id,groups.name`

				const superRes = await api.get(url, {
					headers: { Authorization: `Bearer ${superToken}` }
				})
				expect(superRes.status).toBe(200)
				const superGroupIds = (superRes.data.customer.groups ?? []).map((g: any) => g.id).filter(Boolean)
				expect(superGroupIds.length).toBeGreaterThan(0)

				// limited user CAN read the customer (customer:read) …
				const limitedRes = await api.get(url, {
					headers: { Authorization: `Bearer ${limitedToken}` }
				})
				expect(limitedRes.status).toBe(200)
				// … but the whole linked customer_group branch is gone. Asserting the ids
				// are absent is too weak: it also passes for `groups: [{}, {}]`, which
				// still tells the actor how many groups the customer belongs to.
				expect(limitedRes.data.customer.groups).toBeUndefined()
				expect(limitedRes.data.customer.id).toBe(customerId)
			})
		})

		describe('customer group role resolution', () => {
			it('resolves a customer to the roles held by their group', async () => {
				const container = getContainer()
				const customerService: any = container.resolve(Modules.CUSTOMER)

				const group = await customerService.createCustomerGroups({ name: 'Wholesale' })
				const customer = await customerService.createCustomers({ email: 'wholesale@example.com' })
				await customerService.addCustomerToGroup({ customer_id: customer.id, customer_group_id: group.id })

				await assignRole('customer_group', group.id, 'acrl_super_admin')

				const roleIds = await resolveActorRoles('customer', customer.id, container)

				expect(roleIds).toEqual(['acrl_super_admin'])
			})

			it('unions a directly-assigned role with a role held through a group', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const customerService: any = container.resolve(Modules.CUSTOMER)

				const directRole = await accessService.createAccessRoles({ name: 'Direct Role' })
				const group = await customerService.createCustomerGroups({ name: 'Group Role Holders' })
				const customer = await customerService.createCustomers({ email: 'direct-and-group@example.com' })
				await customerService.addCustomerToGroup({ customer_id: customer.id, customer_group_id: group.id })

				await assignRole('customer', customer.id, directRole.id)
				await assignRole('customer_group', group.id, 'acrl_super_admin')

				// Assert on the raw assignment rows before the resolver's dedupe
				// collapses them -- the union would pass identically whether the two
				// grantee paths are actually isolated or cross-contaminated.
				expect(await assignedRoleIds('customer', customer.id)).toEqual([directRole.id])
				expect(await assignedRoleIds('customer_group', group.id)).toEqual(['acrl_super_admin'])

				const roleIds = await resolveActorRoles('customer', customer.id, container)

				expect(roleIds).toEqual(expect.arrayContaining([directRole.id, 'acrl_super_admin']))
				expect(roleIds).toHaveLength(2)
			})
		})

		describe('api key role resolution', () => {
			it('resolves an api key to its assigned access role', async () => {
				const container = getContainer()
				const apiKeyService: any = container.resolve(Modules.API_KEY)

				const apiKey = await apiKeyService.createApiKeys({
					title: 'CI key',
					type: 'secret',
					created_by: 'test'
				})

				// Actor type `api-key` maps to grantee_type `api_key`.
				await assignRole('api_key', apiKey.id, 'acrl_super_admin')

				const roleIds = await resolveActorRoles('api-key', apiKey.id, container)

				expect(roleIds).toEqual(['acrl_super_admin'])
			})
		})

		describe('tenancy-scoped assignments', () => {
			it('narrows a covered resource end to end, admits asserted mutations inside the tenant, and stays inert for role-id resolution', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				// A contrived dimension whose "tenant" is an access_role row itself —
				// exercises the full guard path (holdings → tenancy alternative →
				// composed filter → narrowed query.graph → assertScope) on the
				// plugin's own routes. Core routes that call the raw remoteQuery
				// callable (e.g. /admin/customers) cannot be narrowed by design —
				// the interceptor denies them for scoped actors.
				defineTenancy({ type: 'test_desk', resources: { access_role: (ids: string[]) => ({ id: ids }) } })

				const [readPolicy] = await accessService.listAccessPolicies({ key: 'access_role:read' })
				const [updatePolicy] = await accessService.listAccessPolicies({ key: 'access_role:update' })
				const role = await accessService.createAccessRoles({ name: 'Desk Operator' })
				await accessService.createAccessRolePolicies({ role_id: role.id, policy_id: readPolicy.id })
				await accessService.createAccessRolePolicies({ role_id: role.id, policy_id: updatePolicy.id })

				const inTenant = await accessService.createAccessRoles({ name: 'Desk Tenant Role' })
				const outOfTenant = await accessService.createAccessRoles({ name: 'Other Desk Role' })

				const actor = await setupAdmin('tenancy-actor@example.com')
				await accessService.createAccessRoleAssignments({
					role_id: role.id,
					grantee_type: 'user',
					grantee_id: actor.userId,
					scope_type: 'test_desk',
					scope_id: inTenant.id
				})

				// The scoped holding is invisible to role-id resolution — a
				// tenancy-pinned role must never resolve as held-everywhere.
				expect(await resolveActorRoles('user', actor.userId, container)).toEqual([])

				// Reads admit and narrow: only the tenant's rows come back.
				const authHeader = { headers: { Authorization: `Bearer ${actor.token}` } }
				const list = await api.get('/admin/access/roles', authHeader)
				expect(list.status).toBe(200)
				const ids = list.data.roles.map((r: any) => r.id)
				expect(ids).toContain(inTenant.id)
				expect(ids).not.toContain(outOfTenant.id)

				// An in-tenant mutation passes through the assertsScope route: the
				// guard admits it, the handler's assertScope proves the row sits
				// inside the composed tenancy filter.
				const update = await api.post(`/admin/access/roles/${inTenant.id}`, { description: 'updated in tenant' }, authHeader).catch((e: any) => e.response)
				expect(update.status).toBe(200)

				// An out-of-tenant mutation 404s — the row is narrowed away entirely,
				// so existence is never confirmed.
				const denied = await api.post(`/admin/access/roles/${outOfTenant.id}`, { description: 'nope' }, authHeader).catch((e: any) => e.response)
				expect(denied.status).toBe(404)
			})

			it('performs the scope assertion on a route with a declared target — no handler assertScope needed', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				// The policies routes declare no assertsScope; the explicit target
				// declaration (the same data the generated core map carries) is what
				// lets the guard assert the row itself.
				defineTenancy({ type: 'test_policy_row', resources: { access_policy: (ids: string[]) => ({ id: ids }) } })
				requirePolicies({
					matcher: '/admin/access/policies/:id',
					method: ['POST'],
					policies: [{ resource: 'access_policy', operation: 'update' }],
					target: { resource: 'access_policy', param: 'id' }
				})

				const inTenant = await accessService.createAccessPolicies({ key: 'desk_thing:read', resource: 'desk_thing', operation: 'read' })
				const outOfTenant = await accessService.createAccessPolicies({ key: 'desk_thing:update', resource: 'desk_thing', operation: 'update' })

				const [updatePolicy] = await accessService.listAccessPolicies({ key: 'access_policy:update' })
				const role = await accessService.createAccessRoles({ name: 'Policy Desk Operator' })
				await accessService.createAccessRolePolicies({ role_id: role.id, policy_id: updatePolicy.id })

				const actor = await setupAdmin('tenancy-target-actor@example.com')
				await accessService.createAccessRoleAssignments({
					role_id: role.id,
					grantee_type: 'user',
					grantee_id: actor.userId,
					scope_type: 'test_policy_row',
					scope_id: inTenant.id
				})

				const authHeader = { headers: { Authorization: `Bearer ${actor.token}` } }
				const update = await api.post(`/admin/access/policies/${inTenant.id}`, { description: 'updated via guard-side assert' }, authHeader).catch((e: any) => e.response)
				expect(update.status).toBe(200)

				const denied = await api.post(`/admin/access/policies/${outOfTenant.id}`, { description: 'nope' }, authHeader).catch((e: any) => e.response)
				expect(denied.status).toBe(404)
			})

			it('enforces the declared create rule: payloads land inside the tenant or not at all', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				// The "tenant" is the policy's resource string — contrived, but it
				// exercises the declared payload rule end to end: body.resource must
				// fall inside the assignment's scope ids.
				defineTenancy({
					type: 'test_policy_kind',
					resources: { access_policy: (ids: string[]) => ({ resource: ids }) },
					create_fields: { access_policy: 'resource' }
				})

				const [createPolicy] = await accessService.listAccessPolicies({ key: 'access_policy:create' })
				const role = await accessService.createAccessRoles({ name: 'Policy Kind Creator' })
				await accessService.createAccessRolePolicies({ role_id: role.id, policy_id: createPolicy.id })

				const actor = await setupAdmin('tenancy-create-actor@example.com')
				await accessService.createAccessRoleAssignments({
					role_id: role.id,
					grantee_type: 'user',
					grantee_id: actor.userId,
					scope_type: 'test_policy_kind',
					scope_id: 'desk_gadget'
				})

				const authHeader = { headers: { Authorization: `Bearer ${actor.token}` } }
				const created = await api
					.post('/admin/access/policies', { key: 'desk_gadget:read', resource: 'desk_gadget', operation: 'read' }, authHeader)
					.catch((e: any) => e.response)
				expect(created.status).toBe(200)

				const outside = await api
					.post('/admin/access/policies', { key: 'desk_widget:read', resource: 'desk_widget', operation: 'read' }, authHeader)
					.catch((e: any) => e.response)
				expect(outside.status).toBe(403)

				// A missing value denies too — a default would land the row unchecked.
				const missing = await api
					.post('/admin/access/policies', { key: 'desk_gadget:write', operation: 'update' } as any, authHeader)
					.catch((e: any) => e.response)
				expect([400, 403]).toContain(missing.status)
			})
		})

		describe('scoped grants', () => {
			it('persists a scope on a role policy and returns it through inheritance', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				const parent = await accessService.createAccessRoles({ name: 'Scoped Parent' })
				const child = await accessService.createAccessRoles({ name: 'Scoped Child' })
				// 'customer:delete' is one of the core policies synced on module boot
				// (see "syncs the 14 core policy definitions" above), so it already
				// exists -- fetch it rather than re-creating (would violate the
				// unique `key` index), matching the `custRead` lookup pattern used
				// by the field-filter tests above.
				const [policy] = await accessService.listAccessPolicies({ key: 'customer:delete' })

				await accessService.createAccessRolePolicies({ role_id: parent.id, policy_id: policy.id, scope: 'company' })
				await accessService.createAccessRoleParents([{ role_id: child.id, parent_id: parent.id }])

				const [resolved] = await accessService.listAccessRoles({ id: child.id }, { relations: ['policies'] })
				const inherited = resolved.policies.find((p: any) => p.resource === 'customer' && p.operation === 'delete')

				expect(inherited.scope).toBe('company')
			})

			// The test above asserts through `accessService.listAccessRoles` only,
			// which never touches `has-permission.ts`'s `query.graph` call -- it
			// would not catch a regression there (e.g. `scope` silently dropped by
			// a field-selection change). This pins the whole chain a real request
			// actually uses: role -> query.graph -> authorize/hasPermission.
			it('pins the query.graph -> authorize chain end to end for a scoped grant', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				const role = await accessService.createAccessRoles({ name: 'Scoped Deleter' })
				const [policy] = await accessService.listAccessPolicies({ key: 'customer:delete' })
				await accessService.createAccessRolePolicies({ role_id: role.id, policy_id: policy.id, scope: 'company' })

				const authService: any = container.resolve(Modules.AUTH)
				const { authIdentity } = await authService.register('emailpass', {
					body: { email: 'scoped-chain@example.com', password: 'Sup3rSecret!' }
				})
				const { result: user } = await createUserAccountWorkflow(container).run({
					input: {
						authIdentityId: authIdentity!.id,
						userData: {
							email: 'scoped-chain@example.com',
							first_name: 'Scoped',
							last_name: 'Chain'
						}
					}
				})

				await assignRole('user', user.id, role.id)

				await expect(
					hasPermission({
						roles: [role.id],
						actions: { resource: 'customer', operation: 'delete' },
						container
					})
				).resolves.toBe(false)

				const decision = await authorize({
					roles: [role.id],
					actions: { resource: 'customer', operation: 'delete' },
					container
				})

				expect(decision).toEqual({ granted: true, scopes: [{ resource: 'customer', alternatives: [{ scope: 'company' }] }] })
			})
		})

		describe('scoped assignability', () => {
			// Floor role: unrestricted on everything these routes gate at the guard
			// level (user:*, access_role:*, access_policy:read) so requests reach the
			// workflow steps under test. The escalation under test is on
			// `customer:delete`, a resource none of those route-level checks touch.
			const grantFloorPolicy = async (accessService: any, roleId: string, key: string) => {
				const [policy] = await accessService.listAccessPolicies({ key })
				await accessService.createAccessRolePolicies({ role_id: roleId, policy_id: policy.id })
			}

			// Every actor this block needs, created once. Snapshotting from inside an
			// `it` re-captures the template mid-run, so each test's starting state
			// depends on which tests happened to run before it — the convention is one
			// capture, after all seeding, in `beforeAll`.
			const actors: Record<string, { token: string; userId: string }> = {}

			const createActor = async (label: string, opts: { scope?: string } = {}) => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				// Role names and auth-identity emails are unique per actor so nothing
				// collides across the eleven built here.
				const unique = `${label}-${Math.random().toString(36).slice(2)}`

				const floorRole = await accessService.createAccessRoles({ name: `Floor-${unique}` })
				for (const key of ['user:read', 'user:update', 'access_role:read', 'access_role:create', 'access_role:update', 'access_policy:read']) {
					await grantFloorPolicy(accessService, floorRole.id, key)
				}

				const grantedRole = await accessService.createAccessRoles({ name: `Grant-${unique}` })
				const [customerDeletePolicy] = await accessService.listAccessPolicies({ key: 'customer:delete' })
				await accessService.createAccessRolePolicies({
					role_id: grantedRole.id,
					policy_id: customerDeletePolicy.id,
					...(opts.scope ? { scope: opts.scope } : {})
				})

				const actor = await setupAdmin(`${unique}@example.com`)
				await assignRole('user', actor.userId, floorRole.id)
				await assignRole('user', actor.userId, grantedRole.id)

				return actor
			}

			beforeAll(async () => {
				const scoped = { scope: 'company' } as const
				for (const [key, opts] of [
					['scopedAssign1', scoped],
					['scopedAssign2', scoped],
					['scopedAssign3', scoped],
					['unrestrictedAssign', {}],
					['scopedAssign5', scoped],
					['scopedAssign6', scoped],
					['scopedPolicyRoute1', scoped],
					['scopedPolicyRoute2', scoped],
					['parentEscalation1', scoped],
					['parentEscalation2', scoped],
					['parentEscalation3', scoped]
				] as const) {
					actors[key] = await createActor(key, opts)
				}

				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			const makeTargetRole = async (name: string, opts: { scope?: string } = {}) => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const [customerDeletePolicy] = await accessService.listAccessPolicies({ key: 'customer:delete' })
				const role = await accessService.createAccessRoles({ name: `${name}-${Math.random().toString(36).slice(2)}` })
				await accessService.createAccessRolePolicies({
					role_id: role.id,
					policy_id: customerDeletePolicy.id,
					...(opts.scope ? { scope: opts.scope } : {})
				})
				return role
			}

			it('does not let an actor grant an unrestricted policy they hold only scoped', async () => {
				const actor = actors.scopedAssign1
				const targetRole = await makeTargetRole('UnrestrictedDeleter-1')
				const targetUser = await setupAdmin(`scoped-assign-target-1-${Math.random().toString(36).slice(2)}@example.com`)

				const res = await api
					.post(`/admin/users/${targetUser.userId}/access/roles`, { roles: [targetRole.id] }, { headers: { Authorization: `Bearer ${actor.token}` } })
					.catch((e: any) => e.response)

				expect(res.status).toBe(403)
			})

			it('lets an actor grant a policy at the same scope they hold', async () => {
				const actor = actors.scopedAssign2
				const targetRole = await makeTargetRole('CompanyScopedDeleter-2', { scope: 'company' })
				const targetUser = await setupAdmin(`scoped-assign-target-2-${Math.random().toString(36).slice(2)}@example.com`)

				const res = await api.post(
					`/admin/users/${targetUser.userId}/access/roles`,
					{ roles: [targetRole.id] },
					{ headers: { Authorization: `Bearer ${actor.token}` } }
				)

				expect(res.status).toBe(200)
				expect(res.data.roles.map((r: any) => r.id)).toContain(targetRole.id)
			})

			it('does not let an actor grant a policy at a different scope than they hold', async () => {
				const actor = actors.scopedAssign3
				const targetRole = await makeTargetRole('OwnScopedDeleter-3', { scope: 'own' })
				const targetUser = await setupAdmin(`scoped-assign-target-3-${Math.random().toString(36).slice(2)}@example.com`)

				const res = await api
					.post(`/admin/users/${targetUser.userId}/access/roles`, { roles: [targetRole.id] }, { headers: { Authorization: `Bearer ${actor.token}` } })
					.catch((e: any) => e.response)

				expect(res.status).toBe(403)
			})

			it('lets an actor holding a policy unrestricted grant it at any scope, and unrestricted', async () => {
				const actor = actors.unrestrictedAssign
				const unrestrictedTarget = await makeTargetRole('UnrestrictedDeleter-4')
				const scopedTarget = await makeTargetRole('CompanyScopedDeleter-4', { scope: 'company' })
				const targetUser = await setupAdmin(`scoped-assign-target-4-${Math.random().toString(36).slice(2)}@example.com`)

				const auth = { headers: { Authorization: `Bearer ${actor.token}` } }

				const res1 = await api.post(`/admin/users/${targetUser.userId}/access/roles`, { roles: [unrestrictedTarget.id] }, auth)
				expect(res1.status).toBe(200)
				expect(res1.data.roles.map((r: any) => r.id)).toContain(unrestrictedTarget.id)

				const res2 = await api.post(`/admin/users/${targetUser.userId}/access/roles`, { roles: [scopedTarget.id] }, auth)
				expect(res2.status).toBe(200)
				expect(res2.data.roles.map((r: any) => r.id)).toContain(scopedTarget.id)
			})

			it('lists a policy the actor holds only scoped, since they can assign it at that scope', async () => {
				const actor = actors.scopedAssign5

				const res = await api.get('/admin/access/policies/assignable?limit=1000', { headers: { Authorization: `Bearer ${actor.token}` } })

				expect(res.status).toBe(200)
				const keys = res.data.policies.map((p: any) => p.key)
				// The actor holds customer:delete@company and CAN assign it at that
				// scope (see the role-policies route cases below), so the listing must
				// offer it -- excluding it would be a dead end where the UI hides
				// something the API accepts.
				expect(keys).toContain('customer:delete')
				expect(keys).toContain('user:update')
				// A policy the actor holds at no scope at all is still excluded.
				expect(keys).not.toContain('product:delete')
			})

			it('includes/excludes candidate roles from assignable-roles based on matching scope', async () => {
				const actor = actors.scopedAssign6

				const companyRole = await makeTargetRole('AssignableCompanyRole-6', { scope: 'company' })
				const unrestrictedRole = await makeTargetRole('AssignableUnrestrictedRole-6')
				const ownRole = await makeTargetRole('AssignableOwnRole-6', { scope: 'own' })

				const res = await api.get('/admin/access/roles/assignable?limit=1000', { headers: { Authorization: `Bearer ${actor.token}` } })

				expect(res.status).toBe(200)
				const ids = res.data.roles.map((r: any) => r.id)
				expect(ids).toContain(companyRole.id)
				expect(ids).not.toContain(unrestrictedRole.id)
				expect(ids).not.toContain(ownRole.id)
			})

			// The brief's literal example is self-referential: `access_role:update`
			// gates the very routes that would let us reach this actor's scoped grant
			// over HTTP, so `accessGuard` denies before `validateUserRolePermissionsStep`
			// ever runs (see the "customer:delete" substitution used above, and the
			// report). But a job, subscriber, or MCP tool calls the workflow directly
			// with a container, bypassing the guard entirely -- exactly as
			// `assignUserRolesWorkflow(container).run(...)` is invoked elsewhere in
			// this file (see "user role assignment workflows" above). That is a real
			// path, so the literal escalation is pinned here.
			it('does not let an actor grant access_role:update unrestricted when they hold it only @company (direct workflow invocation)', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const authService: any = container.resolve(Modules.AUTH)
				const unique = Math.random().toString(36).slice(2)

				const [accessRoleUpdatePolicy] = await accessService.listAccessPolicies({ key: 'access_role:update' })

				const actorRole = await accessService.createAccessRoles({ name: `SelfRefCompanyRole-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: actorRole.id, policy_id: accessRoleUpdatePolicy.id, scope: 'company' })

				const targetRole = await accessService.createAccessRoles({ name: `SelfRefUnrestrictedRole-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: targetRole.id, policy_id: accessRoleUpdatePolicy.id })

				const actorEmail = `self-ref-actor-${unique}@example.com`
				const { authIdentity: actorAuthIdentity } = await authService.register('emailpass', {
					body: { email: actorEmail, password: 'Sup3rSecret!' }
				})
				const { result: actorUser } = await createUserAccountWorkflow(container).run({
					input: { authIdentityId: actorAuthIdentity!.id, userData: { email: actorEmail, first_name: 'Self', last_name: 'Ref' } }
				})
				await assignRole('user', actorUser.id, actorRole.id)

				const targetEmail = `self-ref-target-${unique}@example.com`
				const { authIdentity: targetAuthIdentity } = await authService.register('emailpass', {
					body: { email: targetEmail, password: 'Sup3rSecret!' }
				})
				const { result: targetUser } = await createUserAccountWorkflow(container).run({
					input: { authIdentityId: targetAuthIdentity!.id, userData: { email: targetEmail, first_name: 'Self', last_name: 'RefTarget' } }
				})

				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()

				// `expect(promise).rejects.toThrow(...)` does not observe this rejection
				// reliably against the workflow engine's returned promise in this
				// environment (a plain try/catch does) -- assert via try/catch instead.
				let caught: any
				try {
					await assignUserRolesWorkflow(container).run({
						input: { actor_id: actorUser.id, user_id: targetUser.id, role_id: targetRole.id }
					})
				} catch (e) {
					caught = e
				}

				expect(caught).toBeDefined()
				expect(caught.message).toMatch(/permission/i)
			})

			// Task 7's route (POST /admin/access/roles/:id/policies) is the
			// policy->role counterpart to the assignments above, which all target
			// the role->user route. Every case above runs the ACTOR through the
			// role->user route; nothing until now proved `validateUserPermissionsStep`
			// (rewired for scope-awareness in Task 7) is actually reached, in the
			// right order, on THIS route -- the 4 cases added directly under
			// "scoped role-policy assignment route" above all act as a super-admin,
			// which trivially satisfies `canGrantScope` regardless of wiring.
			it('does not let an actor grant customer:delete unrestricted via the role-policies route when they hold it only @company', async () => {
				const actor = actors.scopedPolicyRoute1
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const [customerDeletePolicy] = await accessService.listAccessPolicies({ key: 'customer:delete' })
				const targetRole = await accessService.createAccessRoles({ name: `PolicyRouteTarget-1-${Math.random().toString(36).slice(2)}` })

				const res = await api
					.post(
						`/admin/access/roles/${targetRole.id}/policies`,
						{ policies: [{ id: customerDeletePolicy.id }] },
						{ headers: { Authorization: `Bearer ${actor.token}` } }
					)
					.catch((e: any) => e.response)

				expect(res.status).toBe(403)
			})

			it('lets an actor grant customer:delete via the role-policies route at the same scope they hold', async () => {
				const actor = actors.scopedPolicyRoute2
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const [customerDeletePolicy] = await accessService.listAccessPolicies({ key: 'customer:delete' })
				const targetRole = await accessService.createAccessRoles({ name: `PolicyRouteTarget-2-${Math.random().toString(36).slice(2)}` })

				const res = await api.post(
					`/admin/access/roles/${targetRole.id}/policies`,
					{ policies: [{ id: customerDeletePolicy.id, scope: 'company' }] },
					{ headers: { Authorization: `Bearer ${actor.token}` } }
				)

				expect(res.status).toBe(200)
				expect(res.data.policies[0].scope).toBe('company')
			})

			// Attaching a PARENT confers that parent's entire chain. Without a check,
			// an actor holding only `access_role:update` could point any role they hold
			// at the super-admin role and inherit `*:*` in one request -- an escalation
			// entirely independent of scopes, which would make every rule above moot.
			it('does not let an actor inherit a role whose policies they do not hold, via parent_ids', async () => {
				const actor = actors.parentEscalation1
				const container = getContainer()
				const accessService: any = container.resolve('access')

				const ownRole = await accessService.createAccessRoles({ name: `ParentEscalationOwn-1-${Math.random().toString(36).slice(2)}` })

				const res = await api
					.post(`/admin/access/roles/${ownRole.id}`, { parent_ids: ['acrl_super_admin'] }, { headers: { Authorization: `Bearer ${actor.token}` } })
					.catch((e: any) => e.response)

				expect(res.status).toBe(403)
			})

			it('does not let an actor create a role inheriting from one whose policies they do not hold', async () => {
				const actor = actors.parentEscalation2

				const res = await api
					.post(
						'/admin/access/roles',
						{ name: `ParentEscalationCreate-2-${Math.random().toString(36).slice(2)}`, parent_ids: ['acrl_super_admin'] },
						{ headers: { Authorization: `Bearer ${actor.token}` } }
					)
					.catch((e: any) => e.response)

				expect(res.status).toBe(403)
			})

			it('lets an actor attach a parent whose policies they already hold', async () => {
				const actor = actors.parentEscalation3
				const container = getContainer()
				const accessService: any = container.resolve('access')

				// The actor holds customer:delete@company (from setupActor) plus the
				// floor policies; a parent granting exactly that is within their reach.
				const [customerDeletePolicy] = await accessService.listAccessPolicies({ key: 'customer:delete' })
				const parentRole = await accessService.createAccessRoles({ name: `ParentAllowed-3-${Math.random().toString(36).slice(2)}` })
				await accessService.createAccessRolePolicies({ role_id: parentRole.id, policy_id: customerDeletePolicy.id, scope: 'company' })

				const ownRole = await accessService.createAccessRoles({ name: `ParentEscalationOwn-3-${Math.random().toString(36).slice(2)}` })

				const res = await api.post(
					`/admin/access/roles/${ownRole.id}`,
					{ parent_ids: [parentRole.id] },
					{ headers: { Authorization: `Bearer ${actor.token}` } }
				)

				expect(res.status).toBe(200)
			})
		})

		describe('role-policy admin API (inheritance visibility + scope editing)', () => {
			const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })
			let superToken: string
			let parentRoleId: string
			let childRoleId: string
			let readPolicyId: string

			beforeAll(async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				const unique = Math.random().toString(36).slice(2)
				const superAdmin = await setupAdmin(`rp-admin-${unique}@example.com`, { superAdmin: true })
				superToken = superAdmin.token

				// Registered here rather than reused from another describe: scope
				// registration is global and order-dependent, and this block must not
				// depend on which describe ran first.
				if (!hasScope('access_role', 'rp_probe')) {
					defineScope({ name: 'rp_probe', resource: 'access_role', filter: async () => ({ id: [] }) })
				}

				const [readPolicy] = await accessService.listAccessPolicies({ key: 'access_role:read' })
				readPolicyId = readPolicy.id
				const [customerDelete] = await accessService.listAccessPolicies({ key: 'customer:delete' })

				const parent = await accessService.createAccessRoles({ name: `RPParent-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: parent.id, policy_id: readPolicy.id })
				parentRoleId = parent.id

				const child = await accessService.createAccessRoles({ name: `RPChild-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: child.id, policy_id: customerDelete.id })
				await accessService.createAccessRoleParents([{ role_id: child.id, parent_id: parent.id }])
				childRoleId = child.id

				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			it('returns inherited grants alongside direct ones, naming the role each comes from', async () => {
				const res = await api.get(`/admin/access/roles/${childRoleId}/policies`, bearer(superToken))
				expect(res.status).toBe(200)

				// Direct grants keep their existing shape and their link id, so the
				// detach action still has something to act on.
				expect(res.data.policies.map((p: any) => p.policy)).toEqual(['customer:delete'])

				const inherited = res.data.inherited
				expect(inherited).toHaveLength(1)
				expect(inherited[0]).toMatchObject({
					policy: 'access_role:read',
					inherited_from_role_id: parentRoleId
				})
				expect(inherited[0].inherited_from_role_name).toContain('RPParent')
			})

			it('omits inherited grants when direct_only is requested', async () => {
				const res = await api.get(`/admin/access/roles/${childRoleId}/policies?direct_only=true`, bearer(superToken))
				expect(res.status).toBe(200)
				expect(res.data.inherited).toEqual([])
				expect(res.data.policies).toHaveLength(1)
			})

			// Same reason as the rename restore below: an assertion that throws must not
			// leave this describe's shared grant scoped for whatever runs next.
			afterEach(async () => {
				await api.post(`/admin/access/roles/${parentRoleId}/policies/${readPolicyId}`, { scope: null }, bearer(superToken)).catch(() => undefined)
			})

			it('changes an existing grant scope in place, without detach and re-attach', async () => {
				const res = await api.post(`/admin/access/roles/${parentRoleId}/policies/${readPolicyId}`, { scope: 'rp_probe' }, bearer(superToken))
				expect(res.status).toBe(200)
				expect(res.data.policy.scope).toBe('rp_probe')

				const check = await api.get(`/admin/access/roles/${parentRoleId}/policies`, bearer(superToken))
				expect(check.data.policies).toHaveLength(1)
				expect(check.data.policies[0].scope).toBe('rp_probe')

				// Clearing it back is the other half of the contract, not just cleanup.
				const cleared = await api.post(`/admin/access/roles/${parentRoleId}/policies/${readPolicyId}`, { scope: null }, bearer(superToken))
				expect(cleared.status).toBe(200)
				expect(cleared.data.policy.scope).toBeNull()
			})

			it('rejects a scope with no defineScope registration', async () => {
				const res = await api
					.post(`/admin/access/roles/${parentRoleId}/policies/${readPolicyId}`, { scope: 'not-registered-anywhere' }, bearer(superToken))
					.catch((e: any) => e.response)

				// A bare `>= 400` here would pass on a 500 from any cause; this is a
				// validation refusal and has to be asserted as one.
				expect(res.status).toBe(400)
			})

			// The child inherits `access_role:read` from its parent, so there is no
			// direct `access_role_policy` row to re-scope. Before this, the update ran
			// against a selector matching nothing and answered 200 -- telling an
			// operator a tightening had applied when nothing was written.
			it('404s re-scoping a grant the role only inherits, rather than reporting a no-op as success', async () => {
				const res = await api
					.post(`/admin/access/roles/${childRoleId}/policies/${readPolicyId}`, { scope: 'rp_probe' }, bearer(superToken))
					.catch((e: any) => e.response)

				expect(res.status).toBe(404)
				// Distinguishes it from the 404 a policy id that does not exist at all
				// produces, which a different step raises.
				expect(res.data.message).toContain('nothing to re-scope')
			})

			it('leaves the inherited grant untouched after refusing to re-scope it', async () => {
				const res = await api.get(`/admin/access/roles/${childRoleId}/policies`, bearer(superToken))

				expect(res.status).toBe(200)
				expect(res.data.inherited).toHaveLength(1)
				expect(res.data.inherited[0]).toMatchObject({ policy: 'access_role:read', scope: null })
			})
		})

		describe('scoped enforcement (query interceptor)', () => {
			let visibleARoleId: string
			let visibleBRoleId: string
			let visibleCRoleId: string
			let visibleRoleIds: string[]
			let hiddenRoleId: string
			let listedToken: string
			let unionToken: string
			let mutationToken: string
			let ghostToken: string
			let superToken: string

			beforeAll(async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				// Reuses
				// the same rows rather than collide with the fixed names the scope
				// filters below close over.
				const ensureRole = async (name: string) => {
					const [existing] = await accessService.listAccessRoles({ name })
					return existing ?? (await accessService.createAccessRoles({ name }))
				}

				const visibleA = await ensureRole('Visible A')
				const visibleB = await ensureRole('Visible B')
				// Outside `visibleRoleIds` on purpose -- `named_a` targets this role, so
				// the union case (below) only passes if BOTH scopes actually contribute
				// rows. `named_a` pointed at 'Visible A' (inside `listed`) would make the
				// union indistinguishable from `listed` alone.
				const visibleC = await ensureRole('Visible C')
				const hidden = await ensureRole('Hidden')
				visibleARoleId = visibleA.id
				visibleBRoleId = visibleB.id
				visibleCRoleId = visibleC.id
				visibleRoleIds = [visibleARoleId, visibleBRoleId]
				hiddenRoleId = hidden.id

				// Scope registration is global and this describe must not depend on
				// which one ran first — `defineScope` throws on a duplicate.
				if (!hasScope('access_role', 'listed')) {
					defineScope({ name: 'listed', resource: 'access_role', filter: async () => ({ id: visibleRoleIds }) })
				}
				if (!hasScope('access_role', 'named_a')) {
					defineScope({ name: 'named_a', resource: 'access_role', filter: async () => ({ name: ['Visible C'] }) })
				}

				const [readPolicy] = await accessService.listAccessPolicies({ key: 'access_role:read' })
				const [updatePolicy] = await accessService.listAccessPolicies({ key: 'access_role:update' })

				const unique = Math.random().toString(36).slice(2)

				// Actor 1: holds access_role:read@listed only.
				const listedRole = await accessService.createAccessRoles({ name: `ScopedListedReader-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: listedRole.id, policy_id: readPolicy.id, scope: 'listed' })
				const listedActor = await setupAdmin(`scoped-listed-${unique}@example.com`)
				await assignRole('user', listedActor.userId, listedRole.id)
				listedToken = listedActor.token

				// Actor 2: holds access_role:read@listed AND access_role:read@named_a,
				// via two roles -- access_role_policy's unique index is
				// (role_id, policy_id), so one role cannot hold the same policy at two
				// different scopes.
				const unionListedRole = await accessService.createAccessRoles({ name: `ScopedUnionListed-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: unionListedRole.id, policy_id: readPolicy.id, scope: 'listed' })
				const unionNamedRole = await accessService.createAccessRoles({ name: `ScopedUnionNamedA-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: unionNamedRole.id, policy_id: readPolicy.id, scope: 'named_a' })
				const unionActor = await setupAdmin(`scoped-union-${unique}@example.com`)
				await assignRole('user', unionActor.userId, unionListedRole.id)
				await assignRole('user', unionActor.userId, unionNamedRole.id)
				unionToken = unionActor.token

				// Actor 3: holds access_role:update@listed AND access_role:delete@listed
				// -- the mutation-gate case. `delete` matters: the gate under test only
				// fires once the actor is otherwise granted, so without it the DELETE
				// below is refused for simply lacking the policy and never reaches the
				// assertsScope check at all.
				const [deletePolicy] = await accessService.listAccessPolicies({ key: 'access_role:delete' })
				const mutationRole = await accessService.createAccessRoles({ name: `ScopedMutationUpdater-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: mutationRole.id, policy_id: updatePolicy.id, scope: 'listed' })
				await accessService.createAccessRolePolicies({ role_id: mutationRole.id, policy_id: deletePolicy.id, scope: 'listed' })
				const mutationActor = await setupAdmin(`scoped-mutation-${unique}@example.com`)
				await assignRole('user', mutationActor.userId, mutationRole.id)
				mutationToken = mutationActor.token

				// Actor 4: holds access_role:read@ghost, seeded directly through the
				// module service -- bypassing the workflow's validateRolePolicyScopesStep
				// (hasScope) check, exactly how a stale registration gap would arise. No
				// defineScope for "ghost" is ever registered.
				const ghostRole = await accessService.createAccessRoles({ name: `ScopedGhostReader-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: ghostRole.id, policy_id: readPolicy.id, scope: 'ghost' })
				const ghostActor = await setupAdmin(`scoped-ghost-${unique}@example.com`)
				await assignRole('user', ghostActor.userId, ghostRole.id)
				ghostToken = ghostActor.token

				const superAdmin = await setupAdmin(`scoped-super-${unique}@example.com`, { superAdmin: true })
				superToken = superAdmin.token

				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })

			it('narrows the list to the granted scope, excluding the out-of-scope row', async () => {
				const res = await api.get('/admin/access/roles', bearer(listedToken))
				expect(res.status).toBe(200)
				const ids = res.data.roles.map((r: any) => r.id)
				expect(res.data.roles).toHaveLength(2)
				expect(new Set(ids)).toEqual(new Set(visibleRoleIds))
				expect(ids).not.toContain(hiddenRoleId)
				expect(res.data.count).toBe(2)
			})

			it('404s a foreign row that the scope filtered out', async () => {
				const res = await api.get(`/admin/access/roles/${hiddenRoleId}`, bearer(listedToken)).catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('returns 200 with root fields present for an in-scope row (the field-filter carve-out)', async () => {
				const res = await api.get(`/admin/access/roles/${visibleARoleId}`, bearer(listedToken))
				expect(res.status).toBe(200)
				expect(res.data.role.id).toBe(visibleARoleId)
				expect(res.data.role.name).toBe('Visible A')
				expect(Object.keys(res.data.role).sort()).toEqual(['created_at', 'deleted_at', 'description', 'id', 'metadata', 'name', 'updated_at'].sort())
			})

			// `POST /admin/access/roles/:id` declares `assertsScope`, so a scoped
			// mutation is admitted at the door instead of refused there, and the
			// handler's own `assertScope` call is what decides. These two cases are
			// the framework's only end-to-end proof of a real handler asserting.
			// Inline restores do not run when an assertion above them throws, so a
			// single failure here used to corrupt every later case in this describe —
			// and the resulting cascade points at the wrong test. `afterEach` runs
			// either way.
			afterEach(async () => {
				await api.post(`/admin/access/roles/${visibleBRoleId}`, { name: 'Visible B' }, bearer(superToken)).catch(() => undefined)
			})

			it('admits a scoped mutation on a row inside the scope, and applies it', async () => {
				const res = await api
					.post(`/admin/access/roles/${visibleBRoleId}`, { name: 'Renamed In Scope' }, bearer(mutationToken))
					.catch((e: any) => e.response)
				expect(res.status).toBe(200)

				const check = await api.get(`/admin/access/roles/${visibleBRoleId}`, bearer(superToken))
				expect(check.data.role.name).toBe('Renamed In Scope')
			})

			it('refuses a scoped mutation on a row outside the scope, and leaves it unchanged', async () => {
				const res = await api
					.post(`/admin/access/roles/${hiddenRoleId}`, { name: 'Renamed By Scoped Actor' }, bearer(mutationToken))
					.catch((e: any) => e.response)
				// 404, not 403: the row is narrowed away entirely, so the response
				// cannot distinguish "exists but forbidden" from "absent" — which is the
				// point, since a 403 here would confirm the row exists.
				expect(res.status).toBe(404)

				// And it is `assertScope` that refuses, not the handler's own existence
				// check. The two produce different messages, which is the only thing
				// that tells them apart: with the call ordered after that check, the
				// narrowed lookup 404s first and `assertScope` never runs, so this test
				// passed without the mechanism it names ever executing.
				expect(res.data.message).toBe('access_role with the given id was not found')
				expect(res.data.message).not.toContain('Role with id')

				const check = await api.get(`/admin/access/roles/${hiddenRoleId}`, bearer(superToken))
				expect(check.data.role.name).toBe('Hidden')
			})

			it('still 404s a role that does not exist at all, for an unscoped actor', async () => {
				// `assertScope` is a no-op without a scope on the request, so the
				// handler's existence check is what answers here — the half that
				// reordering must not have cost.
				const res = await api
					.post('/admin/access/roles/acrl_definitely_not_real', { name: 'Nope' }, bearer(superToken))
					.catch((e: any) => e.response)

				expect(res.status).toBe(404)
				expect(res.data.message).toContain('Role with id')
			})

			it('still denies a scoped mutation on a route that does not declare assertsScope', async () => {
				// The actor holds `access_role:delete@listed` and the row is inside that
				// scope, so every other reason to refuse is satisfied: the only thing
				// left is that DELETE carries no `assertsScope`. POST on the identical
				// path, with the same actor and the same row, is admitted above --
				// which is what makes this attributable to the gate rather than to a
				// missing grant.
				const res = await api.delete(`/admin/access/roles/${visibleARoleId}`, bearer(mutationToken)).catch((e: any) => e.response)
				expect(res.status).toBe(403)

				const check = await api.get(`/admin/access/roles/${visibleARoleId}`, bearer(superToken))
				expect(check.data.role.name).toBe('Visible A')
			})

			it('refuses that DELETE at the door, not by narrowing it away', async () => {
				// An out-of-scope row would 404 (narrowed to nothing) and an ungranted
				// policy would 403 from the grant check -- both indistinguishable from
				// the gate by status alone. Same actor, same verb, a row it CAN see:
				// still refused, and refused identically.
				const outOfScope = await api.delete(`/admin/access/roles/${hiddenRoleId}`, bearer(mutationToken)).catch((e: any) => e.response)
				const inScope = await api.delete(`/admin/access/roles/${visibleARoleId}`, bearer(mutationToken)).catch((e: any) => e.response)

				expect(inScope.status).toBe(403)
				expect(outOfScope.status).toBe(403)

				// Both rows survive.
				const survivors = await api.get('/admin/access/roles?limit=200', bearer(superToken))
				const names = survivors.data.roles.map((r: any) => r.name)
				expect(names).toContain('Visible A')
				expect(names).toContain('Hidden')
			})

			it('unions two scopes granted at different names (the live $or probe)', async () => {
				const res = await api.get('/admin/access/roles', bearer(unionToken))
				expect(res.status).toBe(200)
				const ids = res.data.roles.map((r: any) => r.id)
				// `listed` alone would be exactly `visibleRoleIds` (2); `named_a` alone
				// would be exactly `visibleCRoleId` (1). Only a real union of both
				// branches yields all 3 -- losing either branch (a dropped role link, a
				// failure to union scopes across roles, or `combineScopeFilters`
				// collapsing to one survivor) would fail this exact assertion.
				const expectedIds = [...visibleRoleIds, visibleCRoleId]
				expect(res.data.roles).toHaveLength(3)
				expect(new Set(ids)).toEqual(new Set(expectedIds))
				expect(ids).not.toContain(hiddenRoleId)
				expect(res.data.count).toBe(3)
			})

			it('withholds the response when the handler roots on a different resource than the declared scope', async () => {
				const res = await api.get(`/admin/access/roles/${visibleARoleId}/policies`, bearer(listedToken)).catch((e: any) => e.response)
				expect(res.status).toBe(403)
				// Pins this to the ledger's replacement body specifically -- distinct
				// from `deny()`'s "Insufficient permissions (<detail>)" shape elsewhere
				// in the query interceptor, which also returns 403 but with a detail
				// suffix.
				expect(res.data.message).toBe('Insufficient permissions')
			})

			it('denies a grant whose scope has no defineScope registration', async () => {
				// Every guard branch answers with the same status and the same message,
				// so the response alone cannot say WHICH one refused. Deleting the
				// unenforceable-scope check would push this request into the eager
				// scope-resolution catch below it, which throws an identical 403 — this
				// test passed with the mechanism it names removed. The warn-once log is
				// the only thing that distinguishes them.
				const logger: any = getContainer().resolve(ContainerRegistrationKeys.LOGGER)
				const warn = jest.spyOn(logger, 'warn')

				try {
					const res = await api.get('/admin/access/roles', bearer(ghostToken)).catch((e: any) => e.response)

					expect(res.status).toBe(403)
					expect(res.data.message).toBe('Insufficient permissions')

					const warnings = warn.mock.calls.map(([message]: any[]) => String(message))
					expect(warnings.some(message => message.includes('access_role:ghost') && message.includes('no matching defineScope registration'))).toBe(true)
					// The resolver never ran, so this is not the generic resolver-threw
					// path wearing the same status.
					expect(warnings.some(message => message.includes('scope filter'))).toBe(false)
				} finally {
					warn.mockRestore()
				}
			})

			it('leaves the super admin unaffected by the interceptor', async () => {
				const res = await api.get('/admin/access/roles?limit=1000', bearer(superToken))
				expect(res.status).toBe(200)
				const ids = res.data.roles.map((r: any) => r.id)
				expect(ids).toContain(hiddenRoleId)
				expect(ids).toEqual(expect.arrayContaining(visibleRoleIds))
			})
		})

		describe('restricted fields enforcement', () => {
			let adminToken: string
			let customerToken: string
			let customerId: string
			let publishableApiKey: string

			beforeAll(async () => {
				const container = getContainer()
				;({ token: adminToken } = await setupAdmin('restricted-fields@example.com', { superAdmin: true }))

				const scRes = await api.post('/admin/sales-channels', { name: 'Restricted Fields Channel' }, auth())
				const keyRes = await api.post('/admin/api-keys', { title: 'Restricted Fields Key', type: 'publishable' }, auth())
				publishableApiKey = keyRes.data.api_key.token
				await api.post(`/admin/api-keys/${keyRes.data.api_key.id}/sales-channels`, { add: [scRes.data.sales_channel.id] }, auth())

				const authService: any = container.resolve(Modules.AUTH)
				const { authIdentity } = await authService.register('emailpass', {
					body: { email: 'restricted-customer@example.com', password: 'Sup3rSecret!' }
				})
				const { result: customer } = await createCustomerAccountWorkflow(container).run({
					input: {
						authIdentityId: authIdentity!.id,
						customerData: { email: 'restricted-customer@example.com', first_name: 'Restricted', last_name: 'Customer' }
					}
				})
				customerId = customer.id
				const login = await api.post('/auth/customer/emailpass', {
					email: 'restricted-customer@example.com',
					password: 'Sup3rSecret!'
				})
				customerToken = login.data.token

				await dbUtils.snapshot()
			})

			afterAll(() => {
				// Process-global registry; later describes must not inherit this
				// suite's declarations.
				;(global as any).AccessRestrictedFields = new Map()
			})

			const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })
			const customerAuth = () => ({
				headers: { Authorization: `Bearer ${customerToken}`, 'x-publishable-api-key': publishableApiKey }
			})
			const storeHeaders = () => ({ headers: { 'x-publishable-api-key': publishableApiKey } })

			it('makes a requested core-restricted relation byte-indistinguishable from a nonexistent one', async () => {
				// `orders` is in Medusa's DEFAULT_STORE_RESTRICTED_FIELDS and a real
				// relation on customer. Without the guard, requesting it returns
				// `orders: []` while a made-up relation is silently absent — a probe
				// can tell the two apart. With the guard both responses must be
				// byte-identical, and neither confirms the relation exists.
				const restricted = await api.get('/store/customers/me?fields=+orders.id', customerAuth())
				const nonexistent = await api.get('/store/customers/me?fields=+zz_nonexistent.id', customerAuth())

				expect(restricted.status).toBe(200)
				expect(nonexistent.status).toBe(200)
				expect(restricted.data.customer.orders).toBeUndefined()
				expect(restricted.data).toEqual(nonexistent.data)
			})

			it('records an explicit request for a restricted field as a probe in the operator log', async () => {
				const logger: any = getContainer().resolve(ContainerRegistrationKeys.LOGGER)
				const debug = jest.spyOn(logger, 'debug')

				try {
					const res = await api.get('/store/customers/me?fields=+orders.id', customerAuth())
					expect(res.status).toBe(200)

					const messages = debug.mock.calls.map(([message]: any[]) => String(message))
					expect(messages.some(message => message.includes('restricted_field_probe') && message.includes('orders.id'))).toBe(true)
				} finally {
					debug.mockRestore()
				}
			})

			it('strips a registry-declared field on /store while /admin keeps it', async () => {
				declareRestrictedFields({ prefix: '/store', fields: ['addresses'] })

				const store = await api.get('/store/customers/me', customerAuth())
				expect(store.status).toBe(200)
				expect(store.data.customer.id).toBe(customerId)
				expect(store.data.customer.addresses).toBeUndefined()

				const admin = await api.get(`/admin/customers/${customerId}?fields=*addresses`, auth())
				expect(admin.status).toBe(200)
				expect(admin.data.customer.addresses).toEqual(expect.any(Array))
			})

			it('answers ordering by a restricted field identically to ordering by a nonexistent one (list shape)', async () => {
				const restricted = await api.get('/store/products?order=orders', storeHeaders()).catch((e: any) => e.response)
				const nonexistent = await api.get('/store/products?order=zz_nonexistent', storeHeaders()).catch((e: any) => e.response)

				expect(restricted.status).toBe(nonexistent.status)
				expect(restricted.data).toEqual(nonexistent.data)
			})

			it('answers ordering by a restricted field identically on routes that reject or ignore ordering', async () => {
				const restricted = await api.get('/store/customers/me?order=orders', customerAuth()).catch((e: any) => e.response)
				const nonexistent = await api.get('/store/customers/me?order=zz_nonexistent', customerAuth()).catch((e: any) => e.response)

				expect(restricted.status).toBe(nonexistent.status)
				expect(restricted.data).toEqual(nonexistent.data)
			})
		})

		describe('scope discovery and the /access namespace', () => {
			let adminToken: string
			let customerToken: string

			beforeAll(async () => {
				const container = getContainer()
				;({ token: adminToken } = await setupAdmin('access-namespace@example.com', { superAdmin: true }))

				const authService: any = container.resolve(Modules.AUTH)
				const { authIdentity } = await authService.register('emailpass', {
					body: { email: 'namespace-customer@example.com', password: 'Sup3rSecret!' }
				})
				await createCustomerAccountWorkflow(container).run({
					input: {
						authIdentityId: authIdentity!.id,
						customerData: { email: 'namespace-customer@example.com', first_name: 'Namespace', last_name: 'Customer' }
					}
				})
				const login = await api.post('/auth/customer/emailpass', {
					email: 'namespace-customer@example.com',
					password: 'Sup3rSecret!'
				})
				customerToken = login.data.token

				await dbUtils.snapshot()
			})

			afterAll(() => {
				// Process-global namespace config; later describes must not inherit the
				// customer opt-in below.
				;(global as any).AccessNamespaceConfig = { actorTypes: new Set(['user']) }
			})

			const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })
			const customerBearer = () => ({ headers: { Authorization: `Bearer ${customerToken}` } })

			it('lists registered scopes per resource for the pickers', async () => {
				defineScope({ name: 'discovery-test', resource: 'discovery_widget', filter: async () => ({}) })

				const res = await api.get('/admin/access/scopes', auth())

				expect(res.status).toBe(200)
				expect(res.data.scopes).toEqual(expect.arrayContaining([{ resource: 'discovery_widget', names: ['discovery-test'] }]))
			})

			it('serves /access/me/permissions to an admin user with the same contract as the admin path', async () => {
				const viaAccess = await api.get('/access/me/permissions', auth())
				const viaAdmin = await api.get('/admin/access/me/permissions', auth())

				expect(viaAccess.status).toBe(200)
				expect(viaAccess.data.permissions).toEqual(expect.arrayContaining(['access_role:read']))
				expect(viaAccess.data).toEqual(viaAdmin.data)
			})

			it('rejects actor types that have not been opted in', async () => {
				const res = await api.get('/access/me/permissions', customerBearer()).catch((e: any) => e.response)

				expect(res.status).toBe(401)
			})

			it('serves an opted-in actor type its own (empty) permission set', async () => {
				configureAccessNamespace({ actorTypes: ['customer'] })

				const res = await api.get('/access/me/permissions', customerBearer())

				expect(res.status).toBe(200)
				expect(res.data).toEqual({ permissions: [], scoped: [] })
			})
		})

		describe('generic assignments + delegation under tenants', () => {
			it('lets a granter delegate within their own tenant, and only there', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')

				// The dimension registered by the create-rule test: access_policy
				// partitioned by its `resource` string. Target role T carries
				// access_policy:create; the granter holds that authority ONLY
				// pinned to tenant 'desk_gadget'.
				const [createPolicy] = await accessService.listAccessPolicies({ key: 'access_policy:create' })
				const [roleUpdatePolicy] = await accessService.listAccessPolicies({ key: 'access_role:update' })
				const [roleReadPolicy] = await accessService.listAccessPolicies({ key: 'access_role:read' })

				const targetRole = await accessService.createAccessRoles({ name: 'Gadget Policy Creator' })
				await accessService.createAccessRolePolicies({ role_id: targetRole.id, policy_id: createPolicy.id })

				// Unscoped base role: reaches the assignment route (access_role
				// update/read) but carries none of the target role's policies.
				const baseRole = await accessService.createAccessRoles({ name: 'Assignment Desk Base' })
				await accessService.createAccessRolePolicies({ role_id: baseRole.id, policy_id: roleUpdatePolicy.id })
				await accessService.createAccessRolePolicies({ role_id: baseRole.id, policy_id: roleReadPolicy.id })

				// Scoped authority: the target role itself, pinned to the tenant.
				const granter = await setupAdmin('tenant-granter@example.com')
				await accessService.createAccessRoleAssignments({ role_id: baseRole.id, grantee_type: 'user', grantee_id: granter.userId })
				await accessService.createAccessRoleAssignments({
					role_id: targetRole.id,
					grantee_type: 'user',
					grantee_id: granter.userId,
					scope_type: 'test_policy_kind',
					scope_id: 'desk_gadget'
				})

				const grantee = await setupAdmin('tenant-grantee@example.com')
				const authHeader = { headers: { Authorization: `Bearer ${granter.token}` } }

				// Within their tenant: allowed.
				const inTenant = await api
					.post(
						`/admin/access/roles/${targetRole.id}/assignments`,
						{ assignments: [{ grantee_type: 'user', grantee_id: grantee.userId, scope_type: 'test_policy_kind', scope_id: 'desk_gadget' }] },
						authHeader
					)
					.catch((e: any) => e.response)
				expect(inTenant.status).toBe(200)
				expect(inTenant.data.assignments).toEqual(
					expect.arrayContaining([expect.objectContaining({ grantee_id: grantee.userId, scope_id: 'desk_gadget' })])
				)

				// Unscoped: their tenant-pinned authority does not reach it.
				const unscoped = await api
					.post(
						`/admin/access/roles/${targetRole.id}/assignments`,
						{ assignments: [{ grantee_type: 'user', grantee_id: grantee.userId }] },
						authHeader
					)
					.catch((e: any) => e.response)
				expect(unscoped.status).toBe(403)

				// Another tenant: incomparable, denied.
				const otherTenant = await api
					.post(
						`/admin/access/roles/${targetRole.id}/assignments`,
						{ assignments: [{ grantee_type: 'user', grantee_id: grantee.userId, scope_type: 'test_policy_kind', scope_id: 'desk_widget' }] },
						authHeader
					)
					.catch((e: any) => e.response)
				expect(otherTenant.status).toBe(403)

				// And the delegated assignment is removable through the same surface.
				const list = await api.get(`/admin/access/roles/${targetRole.id}/assignments?grantee_id=${grantee.userId}`, authHeader)
				const created = list.data.assignments.find((row: any) => row.grantee_id === grantee.userId)
				const removed = await api
					.delete(`/admin/access/roles/${targetRole.id}/assignments`, { ...authHeader, data: { assignment_ids: [created.id] } })
					.catch((e: any) => e.response)
				expect(removed.status).toBe(200)
			})
		})

		describe('invite role-assignment transfer', () => {
			it('moves an invite’s assignments to the accepting user, scope columns preserved', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const userService: any = container.resolve(Modules.USER)

				const role = await accessService.createAccessRoles({ name: 'Invited Operator' })
				const invite = await userService.createInvites({ email: 'invited-op@example.com' })
				await accessService.createAccessRoleAssignments({
					role_id: role.id,
					grantee_type: 'invite',
					grantee_id: invite.id,
					scope_type: 'test_policy_kind',
					scope_id: 'desk_gadget'
				})

				// Simulate the accept flow's observable effects: the user exists,
				// the invite is deleted, and the event fires with just the id.
				const user = await userService.createUsers({ email: 'invited-op@example.com' })
				await userService.softDeleteInvites([invite.id])
				const eventBus: any = container.resolve(Modules.EVENT_BUS)
				await eventBus.emit({ name: 'invite.accepted', data: { id: invite.id } })

				const transferred = await (async () => {
					for (let attempt = 0; attempt < 30; attempt++) {
						const rows = await accessService.listAccessRoleAssignments({ grantee_type: 'user', grantee_id: user.id })
						if (rows.length) {
							return rows
						}
						await new Promise(resolve => setTimeout(resolve, 100))
					}
					return []
				})()

				expect(transferred).toEqual([
					expect.objectContaining({ role_id: role.id, scope_type: 'test_policy_kind', scope_id: 'desk_gadget' })
				])
				await expect(accessService.listAccessRoleAssignments({ grantee_type: 'invite', grantee_id: invite.id })).resolves.toEqual([])
			})
		})
	}
})
