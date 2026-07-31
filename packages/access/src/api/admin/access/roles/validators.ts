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
	parent_id: z.union([z.string(), z.array(z.string())]).optional(),
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

export type AdminCreateAccessRoleType = z.infer<typeof AdminCreateAccessRole>
export const AdminCreateAccessRole = z
	.object({
		name: z.string(),
		parent_id: z.string().nullish(),
		description: z.string().nullish(),
		metadata: z.record(z.string(), z.unknown()).nullish(),
		policy_ids: z.array(z.string().min(1)).optional()
	})
	.strict()

export type AdminUpdateAccessRoleType = z.infer<typeof AdminUpdateAccessRole>
export const AdminUpdateAccessRole = z
	.object({
		name: z.string().optional(),
		parent_id: z.string().nullish(),
		description: z.string().nullish(),
		metadata: z.record(z.string(), z.unknown()).nullish()
	})
	.strict()

export const AdminAddRolePoliciesType = z.object({
	policies: z.array(z.string().min(1)).min(1)
})

export type AdminAddRolePoliciesType = z.infer<typeof AdminAddRolePoliciesType>

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
