<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	import Level from './reviews-histogram-level.svelte'
	import type { Snippet } from 'svelte'
	let {
		orientation = 'horizontal',
		class: className = '',
		children
	}: { orientation?: 'horizontal' | 'vertical'; class?: string; children: Snippet } = $props()
	const ctx = getReviewsContext()
	const levels = [5, 4, 3, 2, 1]
</script>

{#if ctx.count > 0}
	<div class={cn(orientation === 'vertical' ? 'flex items-end gap-2' : 'flex flex-col gap-1', className)} data-histogram data-orientation={orientation}>
		{#each levels as level (level)}
			<Level {level} {orientation}>{@render children()}</Level>
		{/each}
	</div>
{/if}
