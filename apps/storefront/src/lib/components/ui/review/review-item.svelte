<script lang="ts">
	import { setReviewItemContext } from './reviews-item-ctx.svelte.js'
	import type { StoreReview } from './review-types.js'
	import type { Snippet } from 'svelte'
	let { review, children }: { review: StoreReview; children: Snippet } = $props()
	setReviewItemContext({
		get review() {
			return review
		}
	})
</script>

{@render children()}
