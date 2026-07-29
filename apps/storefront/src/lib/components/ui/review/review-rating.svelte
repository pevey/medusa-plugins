<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewItemContextOptional } from './reviews-item-ctx.svelte.js'
	import { ratingToStarFills } from './review-logic.js'
	import Star from './star.svelte'
	let { class: className = '' }: { class?: string } = $props()
	const r = $derived(getReviewItemContextOptional()?.review)
	const fills = $derived(r ? ratingToStarFills(r.rating) : [])
</script>

{#if fills.length}
	<span class={cn('inline-flex gap-0.5', className)}
		>{#each fills as fill, i (i)}<Star {fill} />{/each}</span
	>
{/if}
