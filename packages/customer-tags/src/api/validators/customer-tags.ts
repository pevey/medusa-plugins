import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export const AdminGetCustomerTag = createFindParams()
export type AdminGetCustomerTagType = z.infer<typeof AdminGetCustomerTag>

export const AdminGetCustomerTags = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	q: z.string().optional()
})
export type AdminGetCustomerTagsType = z.infer<typeof AdminGetCustomerTags>

export const AdminCreateCustomerTag = z.object({
	value: z.string(),
	metadata: z.record(z.unknown()).nullable().optional()
})
export type AdminCreateCustomerTagType = z.infer<typeof AdminCreateCustomerTag>

export const AdminDeleteCustomerTags = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteCustomerTagsType = z.infer<typeof AdminDeleteCustomerTags>

export const AdminUpdateCustomerTag = z.object({
	value: z.string().optional(),
	metadata: z.record(z.unknown()).nullable().optional()
})
export type AdminUpdateCustomerTagType = z.infer<typeof AdminUpdateCustomerTag>

export const AdminAddCustomerTag = z
	.object({
		tag: z.string().optional(),
		tag_id: z.string().optional()
	})
	.superRefine((val, ctx) => {
		if (val.tag && val.tag_id) {
			ctx.addIssue({
				path: ['tag', 'tag_id'],
				code: z.ZodIssueCode.custom,
				message: 'Only one of tag or tag_id can be provided'
			})
		} else if (!val.tag && !val.tag_id) {
			ctx.addIssue({
				path: ['tag', 'tag_id'],
				code: z.ZodIssueCode.custom,
				message: 'Either tag or tag_id must be provided'
			})
		} else if (val.tag_id && !val.tag) {
			val.tag = val.tag_id
			delete val.tag_id
		}
	})
export type AdminAddCustomerTagType = z.infer<typeof AdminAddCustomerTag>
