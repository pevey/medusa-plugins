import { getContext, setContext } from 'svelte'
import type { StoreReview, ReviewSummary } from '../review/review-types.js'

// Surface-neutral reviews collection context. Populated by a surface Root
// (Product/Customer/top-level). Carries the product-aggregate concerns
// (`summary`/`productId`) alongside the list, so Summary/Histogram/Form read
// this single context too. No `$effect`.
// Per-item context (`ReviewItemContext`/`setReviewItemContext`/`getReviewItemContextOptional`)
// lives in the dependency-free `review/` atom now — see `review/reviews-item-ctx.svelte.ts`.
export type ReviewsListContext = {
	readonly reviews: StoreReview[]
	readonly count: number
	readonly filteredCount: number
	readonly loading: boolean
	readonly error: unknown
	readonly rating: number | null
	readonly order: string
	readonly page: number
	readonly pageSize: number
	readonly summary: ReviewSummary | null | undefined
	readonly productId: string
	pushReview: (review: StoreReview) => void
	setRating: (n: number | null) => void
	setOrder: (s: string) => void
	setPage: (n: number) => void
}

const REVIEWS = Symbol('reviews')

export function setReviewsContext(ctx: ReviewsListContext) {
	setContext(REVIEWS, ctx)
}
export function getReviewsContext(): ReviewsListContext {
	const ctx = getContext<ReviewsListContext>(REVIEWS)
	if (!ctx) throw new Error('Reviews.* must be used within a <Reviews.Root> / <Customer.Reviews>')
	return ctx
}
export function getReviewsContextOptional(): ReviewsListContext | null {
	return getContext<ReviewsListContext>(REVIEWS) ?? null
}

// Per-bar context for Reviews.Summary.Histogram (set by histogram-level provider).
export type HistogramLevelContext = {
	readonly level: number
	readonly count: number
	readonly fill: number
	readonly active: boolean
	readonly orientation: 'horizontal' | 'vertical'
	select: () => void
}
const LEVEL = Symbol('histogram-level')
export function setHistogramLevelContext(ctx: HistogramLevelContext) {
	setContext(LEVEL, ctx)
}
export function getHistogramLevelContext(): HistogramLevelContext {
	const ctx = getContext<HistogramLevelContext>(LEVEL)
	if (!ctx) throw new Error('Histogram parts must be used within <Reviews.Summary.Histogram>')
	return ctx
}
