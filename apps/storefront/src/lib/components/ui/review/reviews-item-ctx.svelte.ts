import { getContext, setContext } from 'svelte'
import type { StoreReview } from './review-types.js'

// Per-item context: the single review a `<Review>`/`<Review.*>` atom reads. Set by `<Review>`
// itself (standalone mode) or by a collection's per-row provider (e.g. `Reviews.List`,
// `Reviews.Carousel`). Dependency-free — no list/collection concerns here (see `reviews/`).
export type ReviewItemContext = { readonly review: StoreReview }

const ITEM = Symbol('review-item')

export function setReviewItemContext(ctx: ReviewItemContext) {
	setContext(ITEM, ctx)
}
export function getReviewItemContextOptional(): ReviewItemContext | null {
	return getContext<ReviewItemContext>(ITEM) ?? null
}
