<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCartContext } from './ctx.svelte.js'
	import LineItem from './cart-line-item.svelte'
	import Empty from './cart-empty.svelte'
	import type { Snippet } from 'svelte'

	// `children` is the per-row template; it reads the current line via getLineItemContext().
	let { class: className = '', children, empty }: { class?: string; children?: Snippet; empty?: Snippet } = $props()
	const ctx = getCartContext()
	const items = $derived(ctx.cart?.items ?? [])
</script>

{#if items.length}
	<ul data-cart-items role="list" class={cn('divide-y', className)}>
		{#each items as item (item.id)}
			<LineItem {item}>
				{#if children}{@render children()}{:else}
					<span>{item.product_title}{#if item.variant_title} — {item.variant_title}{/if} × {item.quantity}</span>
				{/if}
			</LineItem>
		{/each}
	</ul>
{:else if empty}
	{@render empty()}
{:else}
	<Empty />
{/if}
