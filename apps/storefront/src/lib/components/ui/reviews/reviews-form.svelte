<script lang="ts">
	import type { Snippet } from 'svelte'
	import { cn } from '$lib/utils.js'
	import { reviewForm } from 'sveltekit-medusa-sdk/reviews'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	import { createReviewForm } from './create-review-form.svelte.js'
	import type { ReviewForm, ReviewFormResult } from './review-form-ctx.svelte.js'
	import type { StoreReview } from '../review/review-types.js'

	let {
		open = $bindable(false),
		onOpenChange,
		onsuccess,
		onerror,
		productId,
		messages,
		class: className = '',
		children
	}: {
		open?: boolean
		onOpenChange?: (open: boolean) => void
		onsuccess?: (review: StoreReview) => void
		onerror?: (result: ReviewFormResult) => void
		productId?: string
		messages?: Record<string, string>
		class?: string
		children: Snippet
	} = $props()

	const ctx = getReviewsContext()
	const pid = $derived(productId ?? ctx.productId)
	function setOpen(v: boolean) {
		open = v
		onOpenChange?.(v)
	}

	const driver = createReviewForm(() => ({
		form: reviewForm as unknown as ReviewForm,
		pushReview: ctx.pushReview,
		setOpen,
		messages,
		onsuccess,
		onerror
	}))
</script>

{#if open}
	<form {...driver.enhanced} oninput={driver.clearError} class={cn('flex flex-col gap-4', className)} data-review-form>
		<input type="hidden" name="productId" value={pid} />
		{@render children()}
	</form>
{/if}
