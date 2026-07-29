<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children: Snippet } = $props()
	const ctx = getReviewsContext()
</script>

{#if ctx.count > 0}
	<div class={cn('', className)} data-product-reviews-summary>{@render children()}</div>
{/if}
