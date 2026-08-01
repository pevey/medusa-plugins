<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCartContext } from './ctx.svelte.js'
	import Item from './cart-item.svelte'
	import Empty from './cart-empty.svelte'
	import type { CartLine } from './types.js'
	import type { Snippet } from 'svelte'

	// `children` is the per-row template. It receives the line as an argument, and the same line is
	// on context for the `Cart.Image/Title/Price/Quantity/Remove` parts to read.
	let { class: className = '', children, empty }: { class?: string; children?: Snippet<[{ item: CartLine }]>; empty?: Snippet } = $props()
	const ctx = getCartContext()
	const items = $derived(ctx.cart?.items ?? [])
</script>

{#if items.length}
	<ul data-cart-items role="list" class={cn('divide-y', className)}>
		{#each items as item (item.id)}
			<Item {item}>
				{#if children}{@render children({ item })}{:else}
					<span
						>{item.product_title}{#if item.variant_title}
							— {item.variant_title}{/if} × {item.quantity}</span
					>
				{/if}
			</Item>
		{/each}
	</ul>
{:else if empty}
	{@render empty()}
{:else}
	<Empty />
{/if}
