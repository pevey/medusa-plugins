import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetReviewsType = z.infer<typeof AdminGetReviews>
export const AdminGetReviews = createFindParams({ limit: 20, offset: 0 }).extend({
	q: z.string().optional(),
	// Accept a single value or the array the admin DataTable's multi-select filter sends.
	status: z.union([z.enum(['pending', 'approved', 'rejected']), z.array(z.enum(['pending', 'approved', 'rejected'])).min(1)]).optional(),
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

export type AdminApproveReviewsType = z.infer<typeof AdminApproveReviews>
export const AdminApproveReviews = z.object({
	ids: z.array(z.string()).min(1)
})

export type AdminRejectReviewsType = z.infer<typeof AdminRejectReviews>
export const AdminRejectReviews = z.object({
	ids: z.array(z.string()).min(1)
})

export type AdminFeatureReviewsType = z.infer<typeof AdminFeatureReviews>
export const AdminFeatureReviews = z.object({
	ids: z.array(z.string()).min(1),
	featured: z.boolean().optional().default(true)
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
export const StoreGetReviews = createFindParams({ limit: 20, offset: 0 }).extend({
	featured: z
		.enum(['true', 'false'])
		.transform(v => v === 'true')
		.optional(),
	rating: z.coerce.number().int().min(1).max(5).optional()
})

export type StoreUpdateReviewType = z.infer<typeof StoreUpdateReview>
export const StoreUpdateReview = z.object({
	rating: z.number().min(1).max(5),
	title: z.string().optional(),
	body: z.string().min(1, 'Review body is required'),
	author_name: z.string().min(1, 'Author name is required'),
	order_id: z.string().optional()
})

export type StoreGetMyReviewsType = z.infer<typeof StoreGetMyReviews>
export const StoreGetMyReviews = createFindParams({ limit: 20, offset: 0 }).extend({
	status: z.enum(['pending', 'approved', 'rejected']).optional(),
	product_id: z.string().optional()
})
