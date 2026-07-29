import Root from './reviews-root.svelte'
import List from './reviews-list.svelte'
import SortRoot from './reviews-sort.svelte'

import SummaryRoot from './reviews-summary.svelte'
import SummaryTitle from './reviews-summary-title.svelte'
import SummaryAverage from './reviews-summary-average.svelte'
import SummaryStars from './reviews-summary-stars.svelte'
import SummaryCount from './reviews-summary-count.svelte'
import HistogramRoot from './reviews-histogram.svelte'
import HistogramBar from './reviews-histogram-bar.svelte'
import HistogramLabel from './reviews-histogram-label.svelte'

import PaginationRoot from './reviews-pagination.svelte'
import PaginationPrev from './reviews-pagination-prev.svelte'
import PaginationNext from './reviews-pagination-next.svelte'
import PaginationInfo from './reviews-pagination-info.svelte'

import FormRoot from './reviews-form.svelte'
import FormAuthor from './reviews-form-author.svelte'
import FormRating from './reviews-form-rating.svelte'
import FormTitle from './reviews-form-title.svelte'
import FormBody from './reviews-form-body.svelte'
import FormSubmit from './reviews-form-submit.svelte'
import FormCancel from './reviews-form-cancel.svelte'
import FormError from './reviews-form-error.svelte'

// `reviews/` is the collection namespace: `import * as Reviews from '.../reviews'` gives
// `Reviews.Root`, `Reviews.Summary(.Title/.Average/.Stars/.Count/.Histogram(.Bar/.Label))`,
// `Reviews.Sort`, `Reviews.List`, `Reviews.Pagination(.Prev/.Next/.Info)`,
// `Reviews.Form(.Author/.Rating/.Title/.Body/.Submit/.Cancel/.Error)`, `Reviews.Carousel`.
// Each compound is `Object.assign`-ed onto its own dedicated `*Root` component, and this barrel
// is the SOLE owner/builder of Summary/Histogram/Form — `product/index.ts` no longer rebuilds
// them (it only re-exports `Rating` + `Star`). `Customer.Reviews.Review` still guards against a
// separate cross-family leak by never mutating the shared `Review` compound in place (see
// `customer/index.ts`); that guard is unrelated to Summary/Histogram/Form, which have exactly
// one builder now.
const Histogram = Object.assign(HistogramRoot, { Root: HistogramRoot, Bar: HistogramBar, Label: HistogramLabel })
export const Summary = Object.assign(SummaryRoot, {
	Root: SummaryRoot,
	Title: SummaryTitle,
	Average: SummaryAverage,
	Stars: SummaryStars,
	Count: SummaryCount,
	Histogram
})

export const Sort = SortRoot

export const Pagination = Object.assign(PaginationRoot, {
	Root: PaginationRoot,
	Prev: PaginationPrev,
	Next: PaginationNext,
	Info: PaginationInfo
})

export const Form = Object.assign(FormRoot, {
	Root: FormRoot,
	Author: FormAuthor,
	Rating: FormRating,
	Title: FormTitle,
	Body: FormBody,
	Submit: FormSubmit,
	Cancel: FormCancel,
	Error: FormError
})

export { Root, List }
export { default as Carousel } from './reviews-carousel.svelte'

// Individual exports — `Review` is consumed directly by `customer/index.ts` for its own
// compound-building (`Customer.Reviews.Review`). `product/index.ts` re-exports `Star` from
// `../review/index.js` directly rather than through here (it no longer builds a Reviews compound).
export { default as Review, Star } from '../review/index.js'

export {
	setReviewsContext,
	getReviewsContext,
	getReviewsContextOptional,
	setHistogramLevelContext,
	getHistogramLevelContext
} from './reviews-ctx.svelte.js'
export type { ReviewsListContext, HistogramLevelContext } from './reviews-ctx.svelte.js'

export {
	setReviewItemContext,
	getReviewItemContextOptional
} from '../review/index.js'
export type { ReviewItemContext } from '../review/index.js'

export * as logic from './reviews-logic.js'
// Alias kept for external consumers importing collection logic by this name; `product/index.ts`
// no longer re-exports it (product only re-exports `Rating`/`Star`).
export * as reviewsLogic from './reviews-logic.js'

export type {
	StoreReview,
	ReviewSummary,
	ReviewsListResponse,
	SummaryQuery,
	ReviewsQuery
} from '../review/review-types.js'
