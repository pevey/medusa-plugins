import { PaginatedResponse } from '@medusajs/framework/types'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type ReviewActivityType = 'submit' | 'approve' | 'reject' | 'note'

export type AdminReviewActivity = {
	id: string
	review_id: string
	user_id: string
	type: ReviewActivityType
	note?: string | null
	metadata?: Record<string, unknown> | null
	created_at: string
	updated_at: string
}

export type AdminReview = {
	id: string
	status: ReviewStatus
	rating: number
	title?: string | null
	body: string
	author_name: string
	author_email?: string | null
	product_id?: string | null
	order_id?: string | null
	customer_id?: string | null
	metadata?: Record<string, unknown> | null
	activity?: AdminReviewActivity[]
	created_at: string
	updated_at: string
}

export type AdminReviewsResponse = PaginatedResponse<{
	reviews: AdminReview[]
}>

export type AdminReviewResponse = {
	review: AdminReview
}
