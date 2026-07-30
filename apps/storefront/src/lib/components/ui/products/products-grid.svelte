<script lang="ts">
	import { cn } from '$lib/utils.js'
	import * as Product from '$lib/components/ui/product/index.js'
	import { getProductsContext } from './products-ctx.svelte.js'
	import type { StoreProduct } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	let { class: className = '', children, empty }: { class?: string; children?: Snippet<[{ product: StoreProduct }]>; empty?: Snippet } = $props()
	const ctx = getProductsContext()
</script>

{#if ctx.products.length}
	<div data-products-grid aria-busy={ctx.loading || undefined} class={cn('grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
		{#each ctx.products as product (product.id)}
			{#if children}
				{@render children({ product })}
			{:else}
				<Product.Card {product} href={ctx.href} />
			{/if}
		{/each}
	</div>
{:else if !ctx.loading && empty}
	{@render empty()}
{/if}
