<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	import { averageToStarFills } from '../review/review-logic.js'
	import Star from '../review/star.svelte'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getReviewsContext()
	const fills = $derived(ctx.summary ? averageToStarFills(ctx.summary.average) : [])
</script>

{#if fills.length}
	<span class={cn('inline-flex items-center gap-0.5', className)}
		>{#each fills as fill, i (i)}<Star {fill} />{/each}</span
	>
{/if}
