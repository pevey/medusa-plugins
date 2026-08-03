import { z } from '@medusajs/framework/zod'
import { applyAndAndOrOperators } from '@medusajs/medusa/api/utils/common-validators/index'
import { createFindParams, createOperatorMap, createSelectParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetAccessRoleParamsType = z.infer<typeof AdminGetAccessRoleParams>
export const AdminGetAccessRoleParams = createSelectParams().merge(
	z.object({
		policies: z.union([z.string(), z.array(z.string())]).optional()
	})
)

// Not exported: a merge-only building block, never itself wired to a route as a query schema
// (the invariant harness's "every exported schema is wired to a route" check would otherwise
// flag it as dead contract surface — see `AdminGetAccessRolesParams` below, which is the schema
// actually wired).
const AdminGetAccessRolesParamsFields = z.object({
	q: z.string().optional(),
	id: z.union([z.string(), z.array(z.string())]).optional(),
	name: z.union([z.string(), z.array(z.string())]).optional(),
	created_at: createOperatorMap().optional(),
	updated_at: createOperatorMap().optional(),
	deleted_at: createOperatorMap().optional()
})

export type AdminGetAccessRolesParamsType = z.infer<typeof AdminGetAccessRolesParams>
export const AdminGetAccessRolesParams = createFindParams({
	limit: 50,
	offset: 0
})
	.merge(AdminGetAccessRolesParamsFields)
	.merge(applyAndAndOrOperators(AdminGetAccessRolesParamsFields))

// `parent_ids` is plural to match the workflows and the many-to-many `access_role_parent` model.
// It was previously `parent_id`, which the workflows never read — role inheritance was
// unreachable over HTTP as a result.
export type AdminCreateAccessRoleType = z.infer<typeof AdminCreateAccessRole>
export const AdminCreateAccessRole = z
	.object({
		name: z.string(),
		parent_ids: z.array(z.string().min(1)).optional(),
		description: z.string().nullish(),
		metadata: z.record(z.string(), z.unknown()).nullish(),
		policy_ids: z.array(z.string().min(1)).optional()
	})
	.strict()

export type AdminUpdateAccessRoleType = z.infer<typeof AdminUpdateAccessRole>
export const AdminUpdateAccessRole = z
	.object({
		name: z.string().optional(),
		parent_ids: z.array(z.string().min(1)).optional(),
		description: z.string().nullish(),
		metadata: z.record(z.string(), z.unknown()).nullish()
	})
	.strict()

// Array items may be a bare policy id (unrestricted assignment, the original
// shape) or `{ id, scope }` (a scoped grant -- see Task 7). Kept as one field
// rather than a second mutually-exclusive one since the existing field is
// already named `policies`, not `policy_ids` -- there is nothing to conflict.
export const AdminAddRolePoliciesType = z
	.object({
		policies: z
			.array(
				z.union([
					z.string().min(1),
					z
						.object({
							id: z.string().min(1),
							scope: z.string().min(1).optional()
						})
						.strict()
				])
			)
			.min(1)
	})
	.strict()

export type AdminAddRolePoliciesType = z.infer<typeof AdminAddRolePoliciesType>

// `GET /admin/access/roles/:id/policies` returns inherited grants alongside
// direct ones by default; this opts back out to direct links only.
export type AdminGetRolePoliciesParamsType = z.infer<typeof AdminGetRolePoliciesParams>
export const AdminGetRolePoliciesParams = createSelectParams().merge(
	z.object({
		direct_only: z
			.union([z.boolean(), z.enum(['true', 'false'])])
			.transform(value => value === true || value === 'true')
			.optional()
	})
)

// `null` clears the scope, making the grant unrestricted -- which requires the
// actor to hold the policy unrestricted themselves.
export type AdminUpdateRolePolicyScopeType = z.infer<typeof AdminUpdateRolePolicyScope>
export const AdminUpdateRolePolicyScope = z
	.object({
		scope: z.string().min(1).nullable()
	})
	.strict()

// Not exported: same reason as `AdminGetAccessRolesParamsFields` above.
const AdminGetRoleUsersParamsFields = z.object({
	user_id: z.union([z.string(), z.array(z.string())]).optional()
})

export type AdminGetRoleUsersParamsType = z.infer<typeof AdminGetRoleUsersParams>
export const AdminGetRoleUsersParams = createFindParams({
	limit: 50,
	offset: 0
})
	.merge(AdminGetRoleUsersParamsFields)
	.merge(applyAndAndOrOperators(AdminGetRoleUsersParamsFields))

export type AdminAssignRoleUsersType = z.infer<typeof AdminAssignRoleUsers>
export const AdminAssignRoleUsers = z.object({
	users: z.array(z.string().min(1)).min(1)
})

export type AdminRemoveRoleUsersType = z.infer<typeof AdminRemoveRoleUsers>
export const AdminRemoveRoleUsers = z.object({
	users: z.array(z.string().min(1)).min(1)
})
