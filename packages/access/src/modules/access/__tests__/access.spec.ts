import { join } from 'path'
import { Modules } from '@medusajs/framework/utils'
import { MockEventBusService, moduleIntegrationTestRunner } from '@medusajs/test-utils'
import { IAccessModuleService } from '../types'

jest.setTimeout(60000)

// Load the module + models from the BUILT output (plain CJS) so Medusa's module
// loader resolves the definition and the ORM entities from a single, consistent
// instance set (no TS-under-loader / dual-instance issues). moduleModels must be
// non-empty: the runner gates setupDatabase()/clearDatabase() on its length.
const resolvedModulePath = join(__dirname, '../../../../.medusa/server/src/modules/access')
const moduleModels = [
	require(join(resolvedModulePath, 'models/access-role.js')).default,
	require(join(resolvedModulePath, 'models/access-policy.js')).default,
	require(join(resolvedModulePath, 'models/access-role-policy.js')).default,
	require(join(resolvedModulePath, 'models/access-role-parent.js')).default
]

moduleIntegrationTestRunner<IAccessModuleService>({
	moduleName: 'access',
	resolve: resolvedModulePath,
	moduleModels,
	dbName: 'medusa-access',
	moduleOptions: {},
	injectedDependencies: {
		[Modules.EVENT_BUS]: new MockEventBusService()
	},
	testSuite: ({ service }) => {
		describe('access module service', () => {
			it('seeds the super admin role, policy, and link on start', async () => {
				const roles = await service.listAccessRoles({ id: 'acrl_super_admin' })
				expect(roles).toHaveLength(1)
				expect(roles[0].name).toBe('Super Admin')

				const policies = await service.listAccessPolicies({
					id: 'acpol_super_admin'
				})
				expect(policies).toHaveLength(1)
				expect(policies[0].key).toBe('*:*')
			})

			it('creates a role and a policy and links them', async () => {
				const role = await service.createAccessRoles({ name: 'Editor' })
				const policy = await service.createAccessPolicies({
					key: 'widget:read',
					resource: 'widget',
					operation: 'read',
					name: 'ReadWidget'
				})
				await service.createAccessRolePolicies({
					role_id: role.id,
					policy_id: policy.id
				})

				const forRole = await service.listPoliciesForRole(role.id)
				expect(forRole.map((p: any) => p.key)).toContain('widget:read')
			})

			it('rejects a self-parent and a cycle', async () => {
				const a = await service.createAccessRoles({ name: 'A' })
				const b = await service.createAccessRoles({ name: 'B' })

				await expect(service.createAccessRoleParents([{ role_id: a.id, parent_id: a.id }])).rejects.toThrow()

				// a's parent is b; making b's parent a would create a cycle
				await service.createAccessRoleParents([{ role_id: a.id, parent_id: b.id }])
				await expect(service.createAccessRoleParents([{ role_id: b.id, parent_id: a.id }])).rejects.toThrow()
			})
		})
	}
})
