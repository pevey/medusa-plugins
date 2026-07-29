<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getHistogramLevelContext } from './reviews-ctx.svelte.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const lvl = getHistogramLevelContext()
	const pct = $derived(`${lvl.fill * 100}%`)
	const vertical = $derived(lvl.orientation === 'vertical')
</script>

<button
	type="button"
	data-histogram-bar
	data-active={lvl.active}
	aria-pressed={lvl.active}
	aria-label={`Show ${lvl.level}-star reviews`}
	onclick={() => lvl.select()}
	class={cn(
		vertical ? 'flex flex-col items-center gap-2 text-center' : 'flex items-center gap-2 text-left',
		lvl.active && 'font-semibold',
		className
	)}
>
	{#if children}{@render children()}{/if}
	{#if vertical}
		<span class="bg-muted relative h-24 w-4 flex-1 overflow-hidden rounded">
			<span class="bg-yellow-400 absolute inset-x-0 bottom-0" style={`height:${pct}`}></span>
		</span>
	{:else}
		<span class="bg-muted relative h-2 flex-1 overflow-hidden rounded">
			<span class="bg-yellow-400 absolute inset-y-0 left-0" style={`width:${pct}`}></span>
		</span>
	{/if}
	<span class="text-muted-foreground w-8 text-right text-xs">{lvl.count}</span>
</button>
