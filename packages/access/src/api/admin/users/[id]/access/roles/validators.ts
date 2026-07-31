import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type AdminAssignUserRolesType = z.infer<typeof AdminAssignUserRoles>
export const AdminAssignUserRoles = z.object({
	roles: z.array(z.string().min(1)).min(1)
})

export type AdminRemoveUserRolesType = z.infer<typeof AdminRemoveUserRoles>
export const AdminRemoveUserRoles = z.object({
	roles: z.array(z.string().min(1)).min(1)
})

// Not exported: a merge-only building block, never itself wired to a route as a query schema
// (the invariant harness's "every exported schema is wired to a route" check would otherwise
// flag it as dead contract surface — see `AdminGetUserRolesParams` below, which is the schema
// actually wired).
const AdminGetUserRolesParamsFields = z.object({
	role_id: z.union([z.string(), z.array(z.string())]).optional()
})

export type AdminGetUserRolesParamsType = z.infer<typeof AdminGetUserRolesParams>
export const AdminGetUserRolesParams = createFindParams({
	limit: 50,
	offset: 0
}).merge(AdminGetUserRolesParamsFields)
