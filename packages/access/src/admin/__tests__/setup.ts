import { vi } from 'vitest'
import { z } from '@medusajs/framework/zod'
import { validateAndTransformQuery, validateAndTransformBody } from '@medusajs/framework/http'
import { loadRouteContracts, createContractFake, type ContractFake, type Responder } from 'medusa-admin-test-utils'
import * as RoleValidators from '../../api/admin/access/roles/validators'
import * as RoleQueryConfig from '../../api/admin/access/roles/query-config'
import * as PolicyValidators from '../../api/admin/access/policies/validators'
import * as PolicyQueryConfig from '../../api/admin/access/policies/query-config'
import * as UserRoleValidators from '../../api/admin/users/[id]/access/roles/validators'
import * as UserRoleQueryConfig from '../../api/admin/users/[id]/access/roles/query-config'
import type { AdminAccessRole, AdminAccessPolicy, AdminAccessRolePolicy, AdminAccessRoleUser } from '../types'

// Discovers routes from the real file tree so a route needs no entry below just to be visible
// here. Read as raw text, NOT executed: a route.ts pulls in `@medusajs/framework/utils` ->
// `jsonwebtoken`, which calls `util.inherits` and crashes the whole suite import once Vite
// externalizes Node's `util` for the browser. `loadRouteContracts` recovers the exported HTTP
// verbs by regex over the source text instead.
const routeModules = import.meta.glob('../../api/admin/**/route.ts', { eager: true, query: '?raw', import: 'default' })

// DEVIATES from every other plugin's setup.ts, which does
// `import middlewares from '../../api/middlewares'`. access's routes/policies/query-configs are
// co-located per resource (`roles/middlewares.ts`, `policies/middlewares.ts`,
// `users/[id]/access/roles/middlewares.ts`) and the ROOT `src/api/middlewares.ts` spreads all
// three together -- but every one of those middlewares.ts files also imports `PolicyOperation`
// from the plugin's own `../../../../utils` barrel, to declare each route's `policies: [...]`
// requirement. That barrel (`src/utils/index.ts`) re-exports `access-guard.ts`,
// `has-permission.ts`, `define-policies.ts`, `discover-policies.ts`, and `access-field-filter.ts`,
// which between them import `@medusajs/framework/utils` (-> jsonwebtoken -> jws -> util.inherits,
// same crash class as a route.ts), `fs/promises`, and `@medusajs/modules-sdk` -- none of it
// aliased, none of it something a browser bundle can load. Executing any of the three
// middlewares.ts files (directly, or via the root one) crashes the whole suite import exactly
// like an unguarded route.ts would.
//
// The validators.ts and query-config.ts files, by contrast, are completely safe: pure zod
// (aliased `@medusajs/framework/zod` -> `zod`, aliased `@medusajs/medusa/api/utils/validators` /
// `.../common-validators/index` -> the shims) and plain object literals, respectively. So this
// file hand-mirrors each middlewares.ts's route -> (validator, queryConfig) declarations using
// `validateAndTransformQuery`/`validateAndTransformBody` (imported from the aliased
// `@medusajs/framework/http`, so they still tag `__schema`/`__queryConfig` the same way
// `loadRouteContracts` expects) applied to the REAL, live schema/queryConfig objects -- without
// ever importing a middlewares.ts file or the `utils` barrel. Keep this list in sync with the
// three real middlewares.ts files by hand; there is no way to derive it from them safely.
const routes = [
	{
		matcher: '/admin/access/roles',
		methods: ['GET'],
		middlewares: [validateAndTransformQuery(RoleValidators.AdminGetAccessRolesParams, RoleQueryConfig.listTransformQueryConfig)]
	},
	{
		matcher: '/admin/access/roles/assignable',
		methods: ['GET'],
		middlewares: [validateAndTransformQuery(RoleValidators.AdminGetAccessRolesParams, RoleQueryConfig.listTransformQueryConfig)]
	},
	{
		matcher: '/admin/access/roles/:id',
		methods: ['GET'],
		middlewares: [validateAndTransformQuery(RoleValidators.AdminGetAccessRoleParams, RoleQueryConfig.retrieveTransformQueryConfig)]
	},
	{
		matcher: '/admin/access/roles',
		methods: ['POST'],
		middlewares: [
			validateAndTransformBody(RoleValidators.AdminCreateAccessRole),
			validateAndTransformQuery(RoleValidators.AdminGetAccessRoleParams, RoleQueryConfig.retrieveTransformQueryConfig)
		]
	},
	{
		matcher: '/admin/access/roles/:id',
		methods: ['POST'],
		middlewares: [
			validateAndTransformBody(RoleValidators.AdminUpdateAccessRole),
			validateAndTransformQuery(RoleValidators.AdminGetAccessRoleParams, RoleQueryConfig.retrieveTransformQueryConfig)
		]
	},
	{
		matcher: '/admin/access/roles/:id/policies',
		methods: ['GET'],
		middlewares: [validateAndTransformQuery(RoleValidators.AdminGetAccessRoleParams, RoleQueryConfig.retrieveRolePoliciesTransformQueryConfig)]
	},
	{
		matcher: '/admin/access/roles/:id/policies',
		methods: ['POST'],
		middlewares: [
			validateAndTransformBody(RoleValidators.AdminAddRolePoliciesType),
			validateAndTransformQuery(RoleValidators.AdminGetAccessRoleParams, RoleQueryConfig.retrieveRolePoliciesTransformQueryConfig)
		]
	},
	{ matcher: '/admin/access/roles/:id/policies/:policy_id', methods: ['DELETE'], middlewares: [] },
	{
		matcher: '/admin/access/roles/:id/users',
		methods: ['GET'],
		middlewares: [
			validateAndTransformQuery(RoleValidators.AdminGetRoleUsersParams, {
				...RoleQueryConfig.listRoleUsersTransformQueryConfig,
				// `roles/[id]/users/route.ts` flattens the `user_access_role` join's `user` relation
				// onto bare top-level fields before responding (`users: links.map(l => l.user)`), so
				// the real `defaultAdminRoleUsersFields` -- which describe the PRE-flatten
				// `query.graph` fields (`user.id`, `user.email`, ...) -- don't match the actual
				// response shape at all. Real Medusa only ever uses `defaults` to build the graph
				// query, so this mismatch is invisible there; this harness's `project()` re-applies
				// `defaults` to the RESPONSE too, so using the pre-flatten list here would silently
				// project every returned user down to `{}` (none of `id`/`email`/`first_name`/
				// `last_name` match a top-level key named `user`). Overridden with the POST-flatten
				// field names for the fake's benefit only -- this doesn't change the real backend,
				// just what this test contract models the response shape as.
				defaults: ['id', 'email', 'first_name', 'last_name']
			})
		]
	},
	{ matcher: '/admin/access/roles/:id/users', methods: ['POST'], middlewares: [validateAndTransformBody(RoleValidators.AdminAssignRoleUsers)] },
	{ matcher: '/admin/access/roles/:id/users', methods: ['DELETE'], middlewares: [validateAndTransformBody(RoleValidators.AdminRemoveRoleUsers)] },
	{ matcher: '/admin/access/roles/:id', methods: ['DELETE'], middlewares: [] },

	// `/admin/users` is a CORE Medusa route, not one this plugin owns or declares middlewares for
	// -- there is no `src/api/admin/users/route.ts` here for `loadRouteContracts`'s file-system
	// scan to discover. `add-role-users-modal.tsx`'s user picker calls it anyway (via this
	// plugin's own `hooks/users.ts` -> `useUsersList`) to search the core user list, and always
	// sends an explicit bare `fields=id,email,first_name,last_name` override, so no `queryConfig`
	// is needed here for the fake to project it correctly. A minimal permissive stand-in contract
	// is registered so that call can be answered at all in the harness, the same way a real
	// backend would answer it from a different route file entirely.
	{
		matcher: '/admin/users',
		methods: ['GET'],
		middlewares: [
			validateAndTransformQuery(
				z.object({
					limit: z.coerce.number().optional(),
					offset: z.coerce.number().optional(),
					q: z.string().optional(),
					fields: z.string().optional()
				}),
				{}
			)
		]
	},

	{
		matcher: '/admin/access/policies',
		methods: ['GET'],
		middlewares: [validateAndTransformQuery(PolicyValidators.AdminGetAccessPoliciesParams, PolicyQueryConfig.listTransformQueryConfig)]
	},
	{
		matcher: '/admin/access/policies/assignable',
		methods: ['GET'],
		middlewares: [validateAndTransformQuery(PolicyValidators.AdminGetAccessPoliciesParams, PolicyQueryConfig.listTransformQueryConfig)]
	},
	{
		matcher: '/admin/access/policies/:id',
		methods: ['GET'],
		middlewares: [validateAndTransformQuery(PolicyValidators.AdminGetAccessPolicyParams, PolicyQueryConfig.retrieveTransformQueryConfig)]
	},
	{
		matcher: '/admin/access/policies/:id/roles',
		methods: ['GET'],
		middlewares: [validateAndTransformQuery(PolicyValidators.AdminGetAccessPolicyRolesParams, PolicyQueryConfig.listAccessPolicyRolesTransformQueryConfig)]
	},
	{
		matcher: '/admin/access/policies',
		methods: ['POST'],
		middlewares: [
			validateAndTransformBody(PolicyValidators.AdminCreateAccessPolicy),
			validateAndTransformQuery(PolicyValidators.AdminGetAccessPolicyParams, PolicyQueryConfig.retrieveTransformQueryConfig)
		]
	},
	{
		matcher: '/admin/access/policies/:id',
		methods: ['POST'],
		middlewares: [
			validateAndTransformBody(PolicyValidators.AdminUpdateAccessPolicy),
			validateAndTransformQuery(PolicyValidators.AdminGetAccessPolicyParams, PolicyQueryConfig.retrieveTransformQueryConfig)
		]
	},
	{ matcher: '/admin/access/policies/:id', methods: ['DELETE'], middlewares: [] },

	{
		matcher: '/admin/users/:id/access/roles',
		methods: ['GET'],
		middlewares: [validateAndTransformQuery(UserRoleValidators.AdminGetUserRolesParams, UserRoleQueryConfig.listUserRolesTransformQueryConfig)]
	},
	{ matcher: '/admin/users/:id/access/roles', methods: ['POST'], middlewares: [validateAndTransformBody(UserRoleValidators.AdminAssignUserRoles)] },
	{ matcher: '/admin/users/:id/access/roles/:role_id', methods: ['DELETE'], middlewares: [] },
	{ matcher: '/admin/users/:id/access/roles', methods: ['DELETE'], middlewares: [validateAndTransformBody(UserRoleValidators.AdminRemoveUserRoles)] }
]

export const contracts = loadRouteContracts(routes, { routeModules })

export function makeAccessRole(overrides: Partial<AdminAccessRole> = {}): AdminAccessRole {
	return {
		id: 'accrole_1',
		name: 'Support Agent',
		description: 'Handles customer support tickets.',
		metadata: null,
		created_at: '2026-01-15T10:00:00.000Z',
		updated_at: '2026-01-15T10:00:00.000Z',
		deleted_at: null,
		...overrides
	}
}

export function makeAccessPolicy(overrides: Partial<AdminAccessPolicy> = {}): AdminAccessPolicy {
	return {
		id: 'accpolicy_1',
		key: 'product:read',
		resource: 'product',
		operation: 'read',
		name: null,
		description: null,
		metadata: null,
		created_at: '2026-01-15T10:00:00.000Z',
		updated_at: '2026-01-15T10:00:00.000Z',
		deleted_at: null,
		...overrides
	}
}

// A row from `GET /admin/access/roles/:id/policies`. `policy` is the already-flattened
// permission-key string (see `roles/[id]/policies/route.ts`'s `flattenPolicy`) -- the fix this
// pins is that the page renders `{p.policy}` directly, which crashed with "objects are not valid
// as a React child" back when this field was still the raw `{ id }` relation stub.
export function makeAccessRolePolicy(overrides: Partial<AdminAccessRolePolicy> = {}): AdminAccessRolePolicy {
	return {
		id: 'accrolepolicy_1',
		role_id: 'accrole_1',
		policy_id: 'accpolicy_1',
		policy: 'product:read',
		...overrides
	}
}

// A row from `GET /admin/access/roles/:id/users` (post-fix: a 4-field projection, not the full
// raw `AdminUser` row -- see the `defaults` override on that route's contract above).
export function makeAccessRoleUser(overrides: Partial<AdminAccessRoleUser> = {}): AdminAccessRoleUser {
	return {
		id: 'user_1',
		email: 'jane@example.com',
		first_name: 'Jane',
		last_name: 'Doe',
		...overrides
	}
}

/**
 * The fake the mocked SDK is currently pointed at. The mocked module's `fetch` reads this at
 * CALL time rather than closing over one fake, because `vi.resetModules()` does not evict an
 * already-evaluated module graph in browser mode: a second `mount()` in the same file re-runs
 * `vi.doMock`, but the component keeps the sdk module it already imported. Closing over the fake
 * meant the second test's component talked to the FIRST test's fake — it rendered fine while the
 * new fake recorded zero calls, so any assertion on `fake.calls` silently examined the wrong
 * object. Indirection makes stale module identity harmless.
 */
let currentFake: ContractFake | undefined

/**
 * Installs a contract-checked fake over the plugin's admin SDK. Every request the
 * components make is validated against the plugin's own validators before a responder runs.
 */
export function installFake(responders: Record<string, Responder>) {
	const fake = createContractFake({ contracts, responders })
	currentFake = fake
	vi.doMock('../lib/sdk', () => ({
		sdk: {
			client: {
				fetch: (path: string, options?: Parameters<ContractFake['fetch']>[1]) => {
					if (!currentFake) throw new Error('[access tests] no fake installed for this test')
					return currentFake.fetch(path, options)
				}
			}
		}
	}))
	return fake
}
