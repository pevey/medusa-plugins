<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewItemContextOptional, setReviewItemContext } from './reviews-item-ctx.svelte.js'
	import type { StoreReview } from './review-types.js'
	import type { Snippet } from 'svelte'
	let {
		review,
		class: className = '',
		children
	}: { review?: StoreReview; class?: string; children: Snippet<[{ review: StoreReview }]> } =
		$props()
	// Read whatever context a parent already provided (e.g. the per-item provider set by
	// <List>) BEFORE this component's own setContext call below shadows it, then always
	// re-provide a context whose getter prefers the `review` prop (standalone mode) and
	// falls back to the inherited one — no bare top-level read of `review` needed.
	const inherited = getReviewItemContextOptional()
	setReviewItemContext({
		get review() {
			return (review ?? inherited?.review) as StoreReview
		}
	})
	const resolved = $derived(review ?? inherited?.review ?? null)
</script>

{#if resolved}
	<div class={cn('flex flex-col gap-1', className)} data-review>{@render children({ review: resolved })}</div>
{/if}
