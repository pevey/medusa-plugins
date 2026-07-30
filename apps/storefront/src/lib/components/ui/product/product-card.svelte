<script lang="ts">
	import { cn } from '$lib/utils.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { createProductContext, setProductContext } from './ctx.svelte.js'
	import Title from './product-title.svelte'
	import Thumbnail from './product-thumbnail.svelte'
	import PriceMin from './product-price-min.svelte'
	import PriceMax from './product-price-max.svelte'
	import type { CalculatedPrice } from './format-price.js'
	import type { StoreProduct } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		product: StoreProduct
		/** Product URL. A string is used verbatim; a function is called with the product. */
		href?: string | ((p: StoreProduct) => string)
		class?: string
		/** Rendered below the price — put <AddToCartButton /> here. */
		actions?: Snippet
		/** Replaces the entire card body. */
		children?: Snippet<[{ product: StoreProduct; priceMin: CalculatedPrice | null; priceMax: CalculatedPrice | null; hasPriceRange: boolean }]>
	}
	let { product, href, class: className = '', actions, children }: Props = $props()

	// Local selection: a grid of cards must not all read the same `?v=`, and swatches inside a
	// card must not navigate. Seeds the cheapest purchasable variant, so an <AddToCartButton />
	// dropped into `actions` adds the variant whose price the card shows — with no props.
	const ctx = createProductContext({ product: () => product, selection: 'local' })
	setProductContext(ctx)

	const url = $derived(typeof href === 'function' ? href(product) : (href ?? `/products/${product.handle}`))
</script>

<Card.Root data-product-card class={cn('pt-0', className)}>
	{#if children}
		{@render children({ product, priceMin: ctx.priceMin, priceMax: ctx.priceMax, hasPriceRange: ctx.hasPriceRange })}
	{:else}
		<a href={url} data-product-card-link class="block">
			<Thumbnail class="rounded-t-xl" />
		</a>
		<Card.Content class="flex flex-col gap-2">
			<a href={url} class="hover:underline">
				<Title as="h3" class="text-base font-medium" />
			</a>
			<p class="flex items-baseline gap-1 text-sm">
				<PriceMin />
				{#if ctx.hasPriceRange}
					<span aria-hidden="true">–</span>
					<PriceMax />
				{/if}
			</p>
			{#if actions}
				{@render actions()}
			{/if}
		</Card.Content>
	{/if}
</Card.Root>
