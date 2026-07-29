import CustomerReviewsRoot from './customer-reviews.svelte'
import CustomerReview from './customer-review.svelte'
import CustomerReviewProduct from './customer-review-product.svelte'
import CustomerReviewEdit from './customer-review-edit.svelte'
import CustomerReviewDelete from './customer-review-delete.svelte'
import { List, Sort, Pagination, Review as CoreReview } from '../reviews/index.js'

export { default as SignedIn } from './signed-in.svelte'
export { default as SignedOut } from './signed-out.svelte'
export { default as SignInButton } from './sign-in-button.svelte'
export { default as SignOut } from './sign-out.svelte'
export { default as Menu } from './menu.svelte'
export { default as MenuTrigger } from './menu-trigger.svelte'
export { default as MenuContent } from './menu-content.svelte'
export { default as MenuItem } from './menu-item.svelte'

// `Customer.Reviews`: a signed-in customer's own reviews across all products, built on the
// shared `reviews/` core (List/Sort/Pagination/Review) — no Product-family duplication.
// `Review.Product/Edit/Delete` are customer-surface add-ons — attached via `Object.assign` onto
// a FRESH `CustomerReview` wrapper (a thin forwarder to the core `Review` root), never onto the
// imported `CoreReview` itself, which is the shared singleton the dependency-free `review/`
// item exposes (and that any other surface, e.g. `Reviews.List`, composes over directly);
// mutating it in place would leak these customer-only parts onto every other consumer of that
// singleton too. `CoreReview` is only read here (`.Title`/`.Rating`/`.Date`/`.Author`/`.Body`).
// Like the shared `Review`, the result is directly callable as `<Customer.Reviews.Review>`
// (no `.Root` required), since `Object.assign` targets the wrapper component function.
const Review = Object.assign(CustomerReview, {
	Root: CustomerReview,
	Title: CoreReview.Title,
	Rating: CoreReview.Rating,
	Date: CoreReview.Date,
	Author: CoreReview.Author,
	Body: CoreReview.Body,
	Product: CustomerReviewProduct,
	Edit: CustomerReviewEdit,
	Delete: CustomerReviewDelete
})
export const Reviews = Object.assign(CustomerReviewsRoot, {
	Root: CustomerReviewsRoot,
	List,
	Sort,
	Pagination,
	Review
})
