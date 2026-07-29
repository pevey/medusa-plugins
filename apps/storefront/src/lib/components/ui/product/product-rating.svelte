<script lang="ts">
	import { cn } from '$lib/utils.js'
	// Import review remotes from the /reviews subpath: svelte-check cannot resolve them
	// through the package barrel (the SDK's ./* export maps this straight to reviews.remote).
	import { getReviewSummary } from 'sveltekit-medusa-sdk/reviews'
	import { getProductContextOptional } from './ctx.svelte.js'
	import { averageToStarFills } from '../review/review-logic.js'
	import Star from '../review/star.svelte'
	import type { SummaryQuery } from '../review/review-types.js'

	let { productId, class: className = '' }: { productId?: string; class?: string } = $props()
	const id = $derived(productId ?? getProductContextOptional()?.product?.id ?? '')
	// Live query; cast restores .current/.loading/.error (see review/review-types.ts).
	const q = $derived(id ? (getReviewSummary({ productId: id }) as unknown as SummaryQuery) : null)
	const summary = $derived(q?.current)
	const fills = $derived(summary ? averageToStarFills(summary.average) : [])
</script>

{#if summary && summary.count > 0}
	<div class={cn('flex items-center gap-1', className)} data-product-rating>
		{#each fills as fill, i (i)}<Star {fill} />{/each}
		<span class="text-muted-foreground ml-1 text-sm">({summary.count})</span>
	</div>
{/if}
