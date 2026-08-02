import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import { hasPermission, resolvePermissions } from '../../src/utils'
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
				expect(granted.has('order:delete')).toBe(true)
				expect(granted.has('product:read')).toBe(true)
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
	}
})
