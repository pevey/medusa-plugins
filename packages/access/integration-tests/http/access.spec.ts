import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import { authorize, defineScope, hasPermission, hasScope, resolveActorRoles, resolvePermissions } from '../../src/utils'
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
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa-access',
	inApp: true,
	env: {},
	testSuite: ({ getContainer, dbUtils, utils, api }) => {
		// Register + create an admin user, optionally grant the seeded super-admin
		// role (via the link), and log in. Returns the user id + bearer token.
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
				const link = container.resolve(ContainerRegistrationKeys.LINK)
				await (link as any).create({
					[Modules.USER]: { user_id: user.id },
					access: { access_role_id: 'acrl_super_admin' }
				})
			}
			const login = await api.post('/auth/user/emailpass', {
				email,
				password: 'Sup3rSecret!'
			})
			return { userId: user.id, token: login.data.token }
		}

		// Runs FIRST, on clean boot state (no user↔access_role links yet), so the
		// bootstrap's "first load" precondition holds before other describes create
		// super-admin links into the DB template.
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

				const query = container.resolve(ContainerRegistrationKeys.QUERY)
				const rolesOf = async () => {
					const { data } = await (query as any).graph({
						entity: 'user',
						fields: ['id', 'access_roles.id'],
						filters: { id: user.id }
					})
					return (data[0]?.access_roles ?? []).map((r: any) => r.id)
				}

				expect(await rolesOf()).not.toContain('acrl_super_admin')

				await bootstrapSuperAdminWorkflow(container).run({})
				expect(await rolesOf()).toContain('acrl_super_admin')

				// idempotent: running again does not add a duplicate
				await bootstrapSuperAdminWorkflow(container).run({})
				const roles = await rolesOf()
				expect(roles.filter((r: string) => r === 'acrl_super_admin')).toHaveLength(1)
			})
		})

		describe('access links', () => {
			it('links a user to an access role and resolves it via graph query', async () => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const link = container.resolve(ContainerRegistrationKeys.LINK)
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

				// 3) create the link (user <-> access_role)
				await (link as any).create({
					[Modules.USER]: { user_id: user.id },
					access: { access_role_id: role.id }
				})

				// 4) resolve the role back through the user via graph
				const { data } = await (query as any).graph({
					entity: 'user',
					fields: ['id', 'access_roles.id', 'access_roles.name'],
					filters: { id: user.id }
				})

				expect(data).toHaveLength(1)
				const roleIds = (data[0].access_roles ?? []).map((r: any) => r.id)
				expect(roleIds).toContain(role.id)
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
				const { data: afterAssign } = await (query as any).graph({
					entity: 'user',
					fields: ['id', 'access_roles.id'],
					filters: { id: user.id }
				})
				expect((afterAssign[0].access_roles ?? []).map((r: any) => r.id)).toContain(role.id)

				await removeUserRolesWorkflow(container).run({
					input: { actor_id: user.id, user_id: user.id, role_id: role.id }
				})
				const { data: afterRemove } = await (query as any).graph({
					entity: 'user',
					fields: ['id', 'access_roles.id'],
					filters: { id: user.id }
				})
				expect((afterRemove[0].access_roles ?? []).map((r: any) => r.id)).not.toContain(role.id)
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

				// `jest.retryTimes(1)` is set globally, so a retried run must not
				// re-throw on `defineScope`'s duplicate-registration guard.
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
				const link = container.resolve(ContainerRegistrationKeys.LINK)
				await (link as any).create({
					[Modules.USER]: { user_id: limited.userId },
					access: { access_role_id: role.id }
				})

				const grant = async (roleName: string, key: string, resource: string, operation: string, email: string) => {
					const [existingPolicy] = await accessService.listAccessPolicies({ key })
					const policy = existingPolicy ?? (await accessService.createAccessPolicies({ key, resource, operation, name: key }))
					const grantRole = await accessService.createAccessRoles({ name: roleName })
					await accessService.createAccessRolePolicies({ role_id: grantRole.id, policy_id: policy.id })
					const actor = await setupAdmin(email)
					await (link as any).create({ [Modules.USER]: { user_id: actor.userId }, access: { access_role_id: grantRole.id } })
					return actor.token
				}

				// Holds layer_probe:read and nothing else.
				readOnlyToken = await grant('LayerReadOnly', 'layer_probe:read', 'layer_probe', 'read', 'layer-read@example.com')
				// Holds export_probe:export and nothing else -- not export_probe:update,
				// which is what the subtree floor would otherwise demand.
				exportOnlyToken = await grant('ExportProbeExporter', 'export_probe:export', 'export_probe', 'export', 'export-only@example.com')

				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			it('denies an under-privileged actor on a guardResource-declared write, and admits its read', async () => {
				// `guardResource` is the mechanism the README teaches as the default,
				// and this is its only proof that a read-only actor is refused a write:
				// every other under-privileged denial here goes through the
				// assignability workflows or the query interceptor instead.
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
				const link = container.resolve(ContainerRegistrationKeys.LINK)
				await (link as any).create({
					[Modules.USER]: { user_id: user.id },
					access: { access_role_id: role.id }
				})
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
				// … but the linked customer_group data is stripped (no group ids leak)
				const limitedGroupIds = (limitedRes.data.customer.groups ?? []).map((g: any) => g.id).filter(Boolean)
				expect(limitedGroupIds.length).toBe(0)
			})
		})

		describe('customer group role resolution', () => {
			it('resolves a customer to the roles held by their group', async () => {
				const container = getContainer()
				const link = container.resolve(ContainerRegistrationKeys.LINK)
				const query = container.resolve(ContainerRegistrationKeys.QUERY)
				const customerService: any = container.resolve(Modules.CUSTOMER)

				const group = await customerService.createCustomerGroups({ name: 'Wholesale' })
				const customer = await customerService.createCustomers({ email: 'wholesale@example.com' })
				await customerService.addCustomerToGroup({ customer_id: customer.id, customer_group_id: group.id })

				await (link as any).create({
					[Modules.CUSTOMER]: { customer_group_id: group.id },
					access: { access_role_id: 'acrl_super_admin' }
				})

				const { data } = await query.graph({
					entity: 'customer',
					fields: ['groups.access_roles.id'],
					filters: { id: customer.id }
				})

				expect(data[0].groups[0].access_roles).toEqual([{ id: 'acrl_super_admin' }])
			})

			it('unions a directly-linked role with a role held through a group', async () => {
				const container = getContainer()
				const link = container.resolve(ContainerRegistrationKeys.LINK)
				const query = container.resolve(ContainerRegistrationKeys.QUERY)
				const accessService: any = container.resolve('access')
				const customerService: any = container.resolve(Modules.CUSTOMER)

				const directRole = await accessService.createAccessRoles({ name: 'Direct Role' })
				const group = await customerService.createCustomerGroups({ name: 'Group Role Holders' })
				const customer = await customerService.createCustomers({ email: 'direct-and-group@example.com' })
				await customerService.addCustomerToGroup({ customer_id: customer.id, customer_group_id: group.id })

				await (link as any).create({
					[Modules.CUSTOMER]: { customer_id: customer.id },
					access: { access_role_id: directRole.id }
				})
				await (link as any).create({
					[Modules.CUSTOMER]: { customer_group_id: group.id },
					access: { access_role_id: 'acrl_super_admin' }
				})

				// Assert on the raw query result before the resolver's Set collapses it --
				// the union+dedupe would pass identically whether the two paths are
				// actually isolated or whether the joiner cross-contaminates them.
				const { data } = await query.graph({
					entity: 'customer',
					fields: ['access_roles.id', 'groups.access_roles.id'],
					filters: { id: customer.id }
				})

				expect(data[0].access_roles).toEqual([{ id: directRole.id }])
				expect(data[0].groups[0].access_roles).toEqual([{ id: 'acrl_super_admin' }])

				const roleIds = await resolveActorRoles('customer', customer.id, container)

				expect(roleIds).toEqual(expect.arrayContaining([directRole.id, 'acrl_super_admin']))
				expect(roleIds).toHaveLength(2)
			})
		})

		describe('api key role resolution', () => {
			it('resolves an api key to its linked access role', async () => {
				const container = getContainer()
				const link = container.resolve(ContainerRegistrationKeys.LINK)
				const query = container.resolve(ContainerRegistrationKeys.QUERY)
				const apiKeyService: any = container.resolve(Modules.API_KEY)

				const apiKey = await apiKeyService.createApiKeys({
					title: 'CI key',
					type: 'secret',
					created_by: 'test'
				})

				await (link as any).create({
					[Modules.API_KEY]: { api_key_id: apiKey.id },
					access: { access_role_id: 'acrl_super_admin' }
				})

				const { data } = await query.graph({
					entity: 'api_key',
					fields: ['access_roles.id'],
					filters: { id: apiKey.id }
				})

				expect(data[0].access_roles).toEqual([{ id: 'acrl_super_admin' }])
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
				const link = container.resolve(ContainerRegistrationKeys.LINK)

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

				await (link as any).create({
					[Modules.USER]: { user_id: user.id },
					access: { access_role_id: role.id }
				})

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

				expect(decision).toEqual({ granted: true, scopes: [{ resource: 'customer', scope: 'company' }] })
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

			const setupActor = async (label: string, opts: { scope?: string } = {}) => {
				const container = getContainer()
				const accessService: any = container.resolve('access')
				const link = container.resolve(ContainerRegistrationKeys.LINK)

				// A retried test re-running setup must not collide with the previous
				// attempt's role names or auth identity email.
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
				await (link as any).create({ [Modules.USER]: { user_id: actor.userId }, access: { access_role_id: floorRole.id } })
				await (link as any).create({ [Modules.USER]: { user_id: actor.userId }, access: { access_role_id: grantedRole.id } })

				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()

				return actor
			}

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
				const actor = await setupActor('scoped-assign-1@example.com', { scope: 'company' })
				const targetRole = await makeTargetRole('UnrestrictedDeleter-1')
				const targetUser = await setupAdmin(`scoped-assign-target-1-${Math.random().toString(36).slice(2)}@example.com`)

				const res = await api
					.post(`/admin/users/${targetUser.userId}/access/roles`, { roles: [targetRole.id] }, { headers: { Authorization: `Bearer ${actor.token}` } })
					.catch((e: any) => e.response)

				expect(res.status).toBe(403)
			})

			it('lets an actor grant a policy at the same scope they hold', async () => {
				const actor = await setupActor('scoped-assign-2@example.com', { scope: 'company' })
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
				const actor = await setupActor('scoped-assign-3@example.com', { scope: 'company' })
				const targetRole = await makeTargetRole('OwnScopedDeleter-3', { scope: 'own' })
				const targetUser = await setupAdmin(`scoped-assign-target-3-${Math.random().toString(36).slice(2)}@example.com`)

				const res = await api
					.post(`/admin/users/${targetUser.userId}/access/roles`, { roles: [targetRole.id] }, { headers: { Authorization: `Bearer ${actor.token}` } })
					.catch((e: any) => e.response)

				expect(res.status).toBe(403)
			})

			it('lets an actor holding a policy unrestricted grant it at any scope, and unrestricted', async () => {
				const actor = await setupActor('scoped-assign-4@example.com')
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
				const actor = await setupActor('scoped-assign-5@example.com', { scope: 'company' })

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
				const actor = await setupActor('scoped-assign-6@example.com', { scope: 'company' })

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
				const link = container.resolve(ContainerRegistrationKeys.LINK)
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
				await (link as any).create({ [Modules.USER]: { user_id: actorUser.id }, access: { access_role_id: actorRole.id } })

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
				const actor = await setupActor('scoped-policy-route-1', { scope: 'company' })
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
				const actor = await setupActor('scoped-policy-route-2', { scope: 'company' })
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
				const actor = await setupActor('parent-escalation-1', { scope: 'company' })
				const container = getContainer()
				const accessService: any = container.resolve('access')

				const ownRole = await accessService.createAccessRoles({ name: `ParentEscalationOwn-1-${Math.random().toString(36).slice(2)}` })

				const res = await api
					.post(`/admin/access/roles/${ownRole.id}`, { parent_ids: ['acrl_super_admin'] }, { headers: { Authorization: `Bearer ${actor.token}` } })
					.catch((e: any) => e.response)

				expect(res.status).toBe(403)
			})

			it('does not let an actor create a role inheriting from one whose policies they do not hold', async () => {
				const actor = await setupActor('parent-escalation-2', { scope: 'company' })

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
				const actor = await setupActor('parent-escalation-3', { scope: 'company' })
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

			it('changes an existing grant scope in place, without detach and re-attach', async () => {
				const res = await api.post(`/admin/access/roles/${parentRoleId}/policies/${readPolicyId}`, { scope: 'rp_probe' }, bearer(superToken))
				expect(res.status).toBe(200)
				expect(res.data.policy.scope).toBe('rp_probe')

				const check = await api.get(`/admin/access/roles/${parentRoleId}/policies`, bearer(superToken))
				expect(check.data.policies).toHaveLength(1)
				expect(check.data.policies[0].scope).toBe('rp_probe')

				// And back to unrestricted.
				const cleared = await api.post(`/admin/access/roles/${parentRoleId}/policies/${readPolicyId}`, { scope: null }, bearer(superToken))
				expect(cleared.status).toBe(200)
				expect(cleared.data.policy.scope).toBeNull()
			})

			it('rejects a scope with no defineScope registration', async () => {
				const res = await api
					.post(`/admin/access/roles/${parentRoleId}/policies/${readPolicyId}`, { scope: 'not-registered-anywhere' }, bearer(superToken))
					.catch((e: any) => e.response)
				expect(res.status).toBeGreaterThanOrEqual(400)
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
				const link = container.resolve(ContainerRegistrationKeys.LINK)

				// Retry-safe: a `jest.retryTimes(1)` re-run of this beforeAll must reuse
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

				// `jest.retryTimes(1)` is set globally, so a retried run must not
				// re-throw on `defineScope`'s duplicate-registration guard.
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
				await (link as any).create({ [Modules.USER]: { user_id: listedActor.userId }, access: { access_role_id: listedRole.id } })
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
				await (link as any).create({ [Modules.USER]: { user_id: unionActor.userId }, access: { access_role_id: unionListedRole.id } })
				await (link as any).create({ [Modules.USER]: { user_id: unionActor.userId }, access: { access_role_id: unionNamedRole.id } })
				unionToken = unionActor.token

				// Actor 3: holds access_role:update@listed -- the mutation-gate case.
				const mutationRole = await accessService.createAccessRoles({ name: `ScopedMutationUpdater-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: mutationRole.id, policy_id: updatePolicy.id, scope: 'listed' })
				const mutationActor = await setupAdmin(`scoped-mutation-${unique}@example.com`)
				await (link as any).create({ [Modules.USER]: { user_id: mutationActor.userId }, access: { access_role_id: mutationRole.id } })
				mutationToken = mutationActor.token

				// Actor 4: holds access_role:read@ghost, seeded directly through the
				// module service -- bypassing the workflow's validateRolePolicyScopesStep
				// (hasScope) check, exactly how a stale registration gap would arise. No
				// defineScope for "ghost" is ever registered.
				const ghostRole = await accessService.createAccessRoles({ name: `ScopedGhostReader-${unique}` })
				await accessService.createAccessRolePolicies({ role_id: ghostRole.id, policy_id: readPolicy.id, scope: 'ghost' })
				const ghostActor = await setupAdmin(`scoped-ghost-${unique}@example.com`)
				await (link as any).create({ [Modules.USER]: { user_id: ghostActor.userId }, access: { access_role_id: ghostRole.id } })
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
			it('admits a scoped mutation on a row inside the scope, and applies it', async () => {
				const res = await api
					.post(`/admin/access/roles/${visibleBRoleId}`, { name: 'Renamed In Scope' }, bearer(mutationToken))
					.catch((e: any) => e.response)
				expect(res.status).toBe(200)

				const check = await api.get(`/admin/access/roles/${visibleBRoleId}`, bearer(superToken))
				expect(check.data.role.name).toBe('Renamed In Scope')

				// Restore, so ordering against other cases in this describe cannot matter.
				await api.post(`/admin/access/roles/${visibleBRoleId}`, { name: 'Visible B' }, bearer(superToken))
			})

			it('refuses a scoped mutation on a row outside the scope, and leaves it unchanged', async () => {
				const res = await api
					.post(`/admin/access/roles/${hiddenRoleId}`, { name: 'Renamed By Scoped Actor' }, bearer(mutationToken))
					.catch((e: any) => e.response)
				// 404, not 403: the scoped lookup narrows the row away entirely, so the
				// handler cannot distinguish "exists but forbidden" from "absent" —
				// which is the point, since a 403 here would confirm the row exists.
				expect(res.status).toBe(404)

				const check = await api.get(`/admin/access/roles/${hiddenRoleId}`, bearer(superToken))
				expect(check.data.role.name).toBe('Hidden')
			})

			it('still denies a scoped mutation on a route that does not declare assertsScope', async () => {
				// DELETE on the same path carries no `assertsScope`, so the door-level
				// refusal that used to cover POST as well still applies here.
				const res = await api.delete(`/admin/access/roles/${visibleARoleId}`, bearer(mutationToken)).catch((e: any) => e.response)
				expect(res.status).toBe(403)

				const check = await api.get(`/admin/access/roles/${visibleARoleId}`, bearer(superToken))
				expect(check.data.role.name).toBe('Visible A')
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
				const res = await api.get('/admin/access/roles', bearer(ghostToken)).catch((e: any) => e.response)
				expect(res.status).toBe(403)
				expect(res.data.message).toBe('Insufficient permissions')
			})

			it('leaves the super admin unaffected by the interceptor', async () => {
				const res = await api.get('/admin/access/roles?limit=1000', bearer(superToken))
				expect(res.status).toBe(200)
				const ids = res.data.roles.map((r: any) => r.id)
				expect(ids).toContain(hiddenRoleId)
				expect(ids).toEqual(expect.arrayContaining(visibleRoleIds))
			})
		})
	}
})
