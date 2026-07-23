<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCartContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'

	let { mode = 'total', class: className = '', children }:
		{ mode?: 'total' | 'lines'; class?: string; children?: Snippet<[number]> } = $props()
	const ctx = getCartContext()
	const value = $derived(mode === 'lines' ? ctx.lineCount : ctx.count)
</script>

{#if value > 0}
	{#if children}{@render children(value)}{:else}
		<span
			data-cart-badge
			class={cn('absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold leading-none text-primary-foreground', className)}
		>{value}</span>
	{/if}
{/if}
