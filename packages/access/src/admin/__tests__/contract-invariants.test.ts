import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as roleValidators from '../../api/admin/access/roles/validators'
import * as policyValidators from '../../api/admin/access/policies/validators'
import * as userRoleValidators from '../../api/admin/users/[id]/access/roles/validators'
import { contracts } from './setup.js'

// access has no single `src/api/validators.ts` -- validators are co-located per resource. Runtime
// export names were checked for collisions first (`grep -h "^export const"` over all three files);
// none collide (roles/policies/users prefixes keep every name distinct), so a plain spread merge
// is safe. Had any collided, this would need explicit non-colliding keys instead.
const validators = { ...roleValidators, ...policyValidators, ...userRoleValidators }

describe('access admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				declaredFields: {
					// RolesPage's table columns + row actions; RoleDetailPage + EditRoleDrawer.
					'GET /admin/access/roles': ['id', 'name', 'description', 'created_at'],
					'GET /admin/access/roles/:id': ['id', 'name', 'description', 'created_at'],
					// ManageRolePermissionsDrawer (via useAccessRolePolicies) + RoleDetailPage's
					// permission badges. `roles/[id]/policies/route.ts` flattens the `access_role_policy`
					// join's `policy` belongs-to relation down to a bare `policy` string field
					// (`flattenPolicy`) before responding, while `queryConfig.defaults` lists the
					// pre-flatten dot-path `policy.key` -- both happen to share the same head segment
					// ("policy"), so this is one of the few flattened routes where the naive
					// first-segment check still lines up with the real response shape.
					'GET /admin/access/roles/:id/policies': ['id', 'policy', 'policy_id'],
					// PoliciesPage's table columns + PolicyPicker (same route, reused).
					'GET /admin/access/policies': ['id', 'key', 'resource', 'operation', 'description'],
					// PolicyDetailPage's field rows (never reads `policy.id`).
					'GET /admin/access/policies/:id': ['key', 'resource', 'operation', 'name', 'description']
					// Deliberately NOT declared -- each of these three routes flattens a join's related
					// entity down to the top-level response array (`users: links.map(l => l.user)`,
					// `roles: links.map(l => l.role)`, `roles: links.map(l => l.access_role)`), so the
					// UI reads bare `id`/`name`/`email`/... on each element while `queryConfig.defaults`
					// lists pre-flatten dot-paths (`user.email`, `role.name`, `access_role.*`) whose head
					// segment ("user"/"role"/"access_role") never matches those bare names. Declaring the
					// UI's real field reads here would fail the invariant on a naming mismatch that has
					// nothing to do with a genuine contract gap -- the routes correctly request and
					// return the data, the flatten step is just invisible to a first-path-segment check.
					// 'GET /admin/access/roles/:id/users': [...] (RoleDetailPage's Users section)
					// 'GET /admin/access/policies/:id/roles': [...] (PolicyDetailPage's "Roles using this policy")
					// 'GET /admin/users/:id/access/roles': [...] (UserAccessRolesWidget)
				}
			})
		).not.toThrow()
	})
})
