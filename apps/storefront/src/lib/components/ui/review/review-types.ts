// Local shapes for the ratings store API (the SDK returns these but doesn't export named types).

export type StoreReview = {
	id: string
	rating: number
	title?: string | null
	body: string
	author_name: string
	created_at: string
	featured?: boolean
	status?: string
	product_id?: string | null
	customer_id?: string | null
}

export type ReviewSummary = {
	average: number
	count: number
	distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

export type ReviewsListResponse = { reviews: StoreReview[]; count: number }

// Cast targets restoring `.current`/`.loading`/`.error`, which svelte-check drops from the
// SDK remote-query type (runtime is fine) — same approach as cart/types.ts CartQuery.
export type SummaryQuery = {
	current: ReviewSummary | null | undefined
	loading?: boolean
	error?: unknown
}
export type ReviewsQuery = {
	current: ReviewsListResponse | null | undefined
	loading?: boolean
	error?: unknown
}
