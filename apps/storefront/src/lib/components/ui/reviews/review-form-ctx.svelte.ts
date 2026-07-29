import { getContext, setContext } from 'svelte'
import type { RemoteForm } from '@sveltejs/kit'
import type { StoreReview } from '../review/review-types.js'

// Form-only types: these use `RemoteForm` from `@sveltejs/kit` and so must NOT live in the
// dependency-free `review/` core (see review/review-types.ts for the pure data types).
export type ReviewFormResult = { ok: true; review: StoreReview } | { ok: false; code: string }
export type ReviewForm = RemoteForm<any, ReviewFormResult>
export type ReviewFormContext = {
	readonly form: ReviewForm
	readonly error: string
	readonly submitting: boolean
	readonly messages: Record<string, string>
	setOpen: (open: boolean) => void
}
export type ReviewFormMessages = Record<string, string>

const REVIEW_FORM = Symbol('review-form')

export function setReviewFormContext(ctx: ReviewFormContext) {
	setContext(REVIEW_FORM, ctx)
}
export function getReviewFormContext(): ReviewFormContext {
	const ctx = getContext<ReviewFormContext>(REVIEW_FORM)
	if (!ctx) throw new Error('Reviews.Form.* must be used within <Reviews.Form>')
	return ctx
}
