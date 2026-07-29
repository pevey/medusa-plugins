<script lang="ts">
	// Deletes the signed-in customer's own review, then refreshes `Customer.Reviews`' list.
	// Reads the per-item review from context set by `<Reviews.List>`/`<Review>` (`review/review-item.svelte`).
	// `deleteReview` is product-scoped (requires `productId` + `reviewId`) — see reviews.remote.ts.
	import { Button } from '$lib/components/ui/button/index.js'
	import { cn } from '$lib/utils.js'
	import { deleteReview, getMyReviews } from 'sveltekit-medusa-sdk/reviews'
	import { getReviewsContext } from '../reviews/reviews-ctx.svelte.js'
	import { getReviewItemContextOptional } from '../review/reviews-item-ctx.svelte.js'
	import type { Snippet } from 'svelte'

	let {
		onsuccess,
		onerror,
		class: className = '',
		children
	}: {
		onsuccess?: () => void
		onerror?: (error: unknown) => void
		class?: string
		children?: Snippet
	} = $props()

	const ctx = getReviewsContext()
	const review = $derived(getReviewItemContextOptional()?.review)
	const productId = $derived(review?.product_id ?? '')

	let pending = $state(false)

	async function handleClick() {
		if (pending || !review || !productId) return
		pending = true
		try {
			await deleteReview({ productId, reviewId: review.id })
			await getMyReviews({
				order: ctx.order,
				limit: ctx.pageSize,
				offset: ctx.page * ctx.pageSize
			}).refresh()
			onsuccess?.()
		} catch (e) {
			onerror?.(e)
		} finally {
			pending = false
		}
	}
</script>

{#if review}
	<Button
		type="button"
		variant="destructive"
		size="sm"
		disabled={pending || !productId}
		onclick={handleClick}
		class={cn('', className)}
		data-review-delete
	>
		{#if children}{@render children()}{:else}{pending ? 'Deleting…' : 'Delete'}{/if}
	</Button>
{/if}
