import { setReviewFormContext } from './review-form-ctx.svelte.js'
import { resolveReviewMessage, reviewMessages } from './review-form-messages.js'
import type { ReviewForm, ReviewFormResult } from './review-form-ctx.svelte.js'
import type { StoreReview } from '../review/review-types.js'

export interface CreateReviewFormOptions {
	form: ReviewForm
	pushReview: (review: StoreReview) => void
	setOpen: (open: boolean) => void
	messages?: Record<string, string>
	onsuccess?: (review: StoreReview) => void
	onerror?: (result: ReviewFormResult) => void
}

/**
 * Shared code for `Reviews.Form`: provides the review-form context the submit/error
 * parts read, runs the native remote-form submission, maps failure codes to copy, pushes a
 * successful review into the reviews list, and exposes the enhanced `<form>` attributes.
 * Call it once from the form component's top-level script (component-init scope, so the
 * context is set correctly).
 */
export function createReviewForm(options: () => CreateReviewFormOptions) {
	let error = $state('')

	setReviewFormContext({
		get form() {
			return options().form
		},
		get error() {
			return error
		},
		get submitting() {
			return options().form.pending > 0
		},
		get messages() {
			return options().messages ?? reviewMessages
		},
		setOpen: (o) => options().setOpen(o)
	})

	const enhanced = options().form.enhance(async ({ submit }) => {
		error = ''
		const o = options()
		const msgs = o.messages ?? reviewMessages
		try {
			await submit()
		} catch {
			// A thrown submission produced no ReviewFormResult — a transport-level failure
			// (offline, server unreachable, dropped connection). Surface it as in-form copy
			// instead of letting it bubble up unhandled (which renders outside the form).
			const result: ReviewFormResult = { ok: false, code: 'network' }
			error = resolveReviewMessage(msgs, 'network')
			o.onerror?.(result)
			return
		}
		const r = o.form.result
		if (r?.ok) {
			o.pushReview(r.review)
			o.onsuccess?.(r.review)
		} else if (r) {
			error = resolveReviewMessage(msgs, r.code)
			o.onerror?.(r)
		}
	})

	return {
		/** Spread onto the `<form>` element. */
		get enhanced() {
			return enhanced
		},
		/** Clear the form-level error (wire to the form's `oninput`). */
		clearError() {
			error = ''
		}
	}
}
