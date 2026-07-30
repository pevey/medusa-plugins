<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { setCartLineContext } from './ctx.svelte.js'
	import type { CartLine } from './types.js'
	import type { Snippet } from 'svelte'

	let { item, class: className = '', children, actions }: { item: CartLine; class?: string; children: Snippet; actions?: Snippet } = $props()
	setCartLineContext({
		get item() {
			return item
		}
	})
</script>

<li data-cart-item class={cn('flex gap-4 py-4', className)}>
	{@render children()}
	{#if actions}<div data-cart-item-actions>{@render actions()}</div>{/if}
</li>
