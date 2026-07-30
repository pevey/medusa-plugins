<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	import Item from '../review/review-item.svelte'
	import type { StoreReview } from '../review/review-types.js'
	import type { Snippet } from 'svelte'
	// `children` is a render-prop: `{ review }` is passed per row so a consumer can either use
	// `{#snippet children({ review })}…{/snippet}` directly, OR ignore the param and read the
	// per-item context `Item` sets (subcomponent mode: `<Reviews.List><Review>…</Review></Reviews.List>`).
	let { class: className = '', children }: { class?: string; children: Snippet<[{ review: StoreReview }]> } = $props()
	const ctx = getReviewsContext()
</script>

{#if ctx.reviews.length}
	<div class={cn('flex flex-col gap-6', className)} data-review-list role="list">
		{#each ctx.reviews as review (review.id)}
			<Item {review}>{@render children({ review })}</Item>
		{/each}
	</div>
{/if}
