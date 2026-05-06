import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetReviewsType = z.infer<typeof AdminGetReviews>
export const AdminGetReviews = createFindParams({ limit: 20, offset: 0 }).extend({
	q: z.string().optional(),
	status: z.enum(['pending', 'approved', 'rejected']).optional(),
	product_id: z.string().optional(),
	customer_id: z.string().optional()
})

export type AdminGetReviewType = z.infer<typeof AdminGetReview>
export const AdminGetReview = createFindParams()

export type AdminUpdateReviewType = z.infer<typeof AdminUpdateReview>
export const AdminUpdateReview = z.object({
	status: z.enum(['pending', 'approved', 'rejected']).optional(),
	title: z.string().optional(),
	body: z.string().optional(),
	rating: z.number().min(1).max(5).optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
})

export type AdminDeleteReviewsType = z.infer<typeof AdminDeleteReviews>
export const AdminDeleteReviews = z.object({
	ids: z.array(z.string()).min(1)
})

export type AdminApproveReviewActionType = z.infer<typeof AdminApproveReviewAction>
export const AdminApproveReviewAction = z.object({
	ids: z.array(z.string()).min(1)
})

export type AdminRejectReviewActionType = z.infer<typeof AdminRejectReviewAction>
export const AdminRejectReviewAction = z.object({
	ids: z.array(z.string()).min(1)
})

// ── Store ────────────────────────────────────────────────────────────────────

export type StoreCreateReviewType = z.infer<typeof StoreCreateReview>
export const StoreCreateReview = z.object({
	rating: z.number().min(1).max(5),
	title: z.string().optional(),
	body: z.string().min(1, 'Review body is required'),
	author_name: z.string().min(1, 'Author name is required'),
	author_email: z.email().optional(),
	order_id: z.string().optional()
})

export type StoreGetReviewsType = z.infer<typeof StoreGetReviews>
export const StoreGetReviews = createFindParams({ limit: 20, offset: 0 })
