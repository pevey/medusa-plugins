<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutContext } from './ctx.svelte.js'
	import Item from './checkout-item.svelte'
	import type { Snippet } from 'svelte'
	let { class: className = '', children, empty }: { class?: string; children?: Snippet; empty?: Snippet } = $props()
	const ctx = getCheckoutContext()
	const items = $derived(ctx.cart?.items ?? [])
</script>

{#if items.length}
	<ul data-checkout-items role="list" class={cn('divide-y', className)}>
		{#each items as item (item.id)}
			<Item {item}>
				{#if children}{@render children()}{:else}
					<span>{item.product_title}{#if item.variant_title} — {item.variant_title}{/if} × {item.quantity}</span>
				{/if}
			</Item>
		{/each}
	</ul>
{:else if empty}{@render empty()}{/if}
