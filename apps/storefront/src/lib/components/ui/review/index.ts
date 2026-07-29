import Root from './review.svelte'
import Title from './review-title.svelte'
import Rating from './review-rating.svelte'
import Author from './review-author.svelte'
import Date from './review-date.svelte'
import Body from './review-body.svelte'

export default Object.assign(Root, { Root, Title, Rating, Author, Date, Body })

export { default as Star } from './star.svelte'
export { default as Item } from './review-item.svelte'
export {
	setReviewItemContext,
	getReviewItemContextOptional
} from './reviews-item-ctx.svelte.js'
export type { ReviewItemContext } from './reviews-item-ctx.svelte.js'
export * as logic from './review-logic.js'
export type {
	StoreReview,
	ReviewSummary,
	ReviewsListResponse,
	SummaryQuery,
	ReviewsQuery
} from './review-types.js'
