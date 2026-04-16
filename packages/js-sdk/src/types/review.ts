// Source: packages/reviews/src/api/validators.ts
// Routes: GET/POST /store/reviews/:productId, GET/POST/DELETE /admin/reviews

export interface Review {
	id: string
	status: 'pending' | 'approved' | 'rejected'
	rating: number
	title?: string
	body: string
	author_name: string
	author_email?: string
	product_id: string
	order_id?: string
	customer_id?: string
	metadata?: Record<string, unknown>
	created_at: string
	updated_at: string
}

// ── Store ────────────────────────────────────────────────────────────────────

export interface StoreCreateReviewInput {
	rating: number
	title?: string
	body: string
	author_name: string
	author_email?: string
	order_id?: string
}

export interface StoreReviewListResponse {
	reviews: Review[]
	count: number
	limit: number
	offset: number
}

export interface StoreReviewResponse {
	review: Review
}

// ── Admin ────────────────────────────────────────────────────────────────────

export interface AdminReviewListQuery {
	q?: string
	status?: 'pending' | 'approved' | 'rejected'
	product_id?: string
	customer_id?: string
	limit?: number
	offset?: number
	order?: string
	fields?: string
}

export interface AdminUpdateReviewInput {
	status?: 'pending' | 'approved' | 'rejected'
	title?: string
	body?: string
	rating?: number
	metadata?: Record<string, unknown>
}

export interface AdminReviewListResponse {
	reviews: Review[]
	count: number
	limit: number
	offset: number
}

export interface AdminReviewResponse {
	review: Review
}

export interface AdminReviewDeleteResponse {
	id: string
	object: string
	deleted: boolean
}

export interface AdminReviewBatchResponse {
	ids: string[]
}
