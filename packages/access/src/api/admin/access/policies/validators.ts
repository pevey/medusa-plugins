import { z } from '@medusajs/framework/zod'
import { applyAndAndOrOperators } from '@medusajs/medusa/api/utils/common-validators/index'
import { createFindParams, createOperatorMap, createSelectParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetAccessPolicyParamsType = z.infer<typeof AdminGetAccessPolicyParams>
export const AdminGetAccessPolicyParams = createSelectParams()

export const AdminGetAccessPoliciesParamsFields = z.object({
	q: z.string().optional(),
	id: z.union([z.string(), z.array(z.string())]).optional(),
	key: z.union([z.string(), z.array(z.string())]).optional(),
	resource: z.union([z.string(), z.array(z.string())]).optional(),
	operation: z.union([z.string(), z.array(z.string())]).optional(),
	created_at: createOperatorMap().optional(),
	updated_at: createOperatorMap().optional(),
	deleted_at: createOperatorMap().optional()
})

export type AdminGetAccessPoliciesParamsType = z.infer<typeof AdminGetAccessPoliciesParams>
export const AdminGetAccessPoliciesParams = createFindParams({})
	.extend(AdminGetAccessPoliciesParamsFields.shape)
	.extend(applyAndAndOrOperators(AdminGetAccessPoliciesParamsFields).shape)

export type AdminCreateAccessPolicyType = z.infer<typeof AdminCreateAccessPolicy>
export const AdminCreateAccessPolicy = z
	.object({
		key: z.string(),
		resource: z.string(),
		operation: z.string(),
		name: z.string().nullish(),
		description: z.string().nullish(),
		metadata: z.record(z.string(), z.unknown()).nullish()
	})
	.strict()

export type AdminUpdateAccessPolicyType = z.infer<typeof AdminUpdateAccessPolicy>
export const AdminUpdateAccessPolicy = z
	.object({
		key: z.string().optional(),
		resource: z.string().optional(),
		operation: z.string().optional(),
		name: z.string().nullish(),
		description: z.string().nullish(),
		metadata: z.record(z.string(), z.unknown()).nullish()
	})
	.strict()

export type AdminGetAccessPolicyRolesParamsType = z.infer<typeof AdminGetAccessPolicyRolesParams>
export const AdminGetAccessPolicyRolesParams = createFindParams({
	limit: 10,
	offset: 0
})
