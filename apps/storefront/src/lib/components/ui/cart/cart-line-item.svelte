<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { setLineItemContext } from './ctx.svelte.js'
	import type { CartLine } from './types.js'
	import type { Snippet } from 'svelte'

	let {
		item,
		class: className = '',
		children,
		actions
	}: { item: CartLine; class?: string; children: Snippet; actions?: Snippet } = $props()
	setLineItemContext({
		get item() {
			return item
		}
	})
</script>

<li data-cart-line class={cn('flex gap-4 py-4', className)}>
	{@render children()}
	{#if actions}<div data-cart-line-actions>{@render actions()}</div>{/if}
</li>
