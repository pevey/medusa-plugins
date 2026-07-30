<script lang="ts">
	import Review from '../review/review.svelte'
	import type { StoreReview } from '../review/review-types.js'
	import type { Snippet } from 'svelte'
	let { review, class: className = '', children }: { review?: StoreReview; class?: string; children: Snippet } = $props()
</script>

<Review {review} class={className}>{@render children()}</Review>
