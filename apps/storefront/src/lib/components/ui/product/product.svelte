<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { createProductContext, setProductContext } from './ctx.svelte.js'
	import type { StoreProduct } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		/**
		 * The product. Fetch it reactively in your route (so it re-fetches on navigation and
		 * SSRs) and pass it in, e.g.
		 *   `const product = $derived(await getProductQuery({ slug: page.params.slug, fields: '+variants.inventory_quantity' }))`
		 * Include `+variants.inventory_quantity` so option availability knows stock.
		 */
		product?: StoreProduct | null
		variantParam?: string
		quantityParam?: string
		class?: string
		children: Snippet
	}
	let { product, variantParam = 'v', quantityParam = 'quantity', class: className = '', children }: Props = $props()

	// URL-driven selection (`?v=`, `?quantity=`) — see createProductContext.
	setProductContext(
		createProductContext({
			product: () => product ?? null,
			selection: 'url',
			variantParam: () => variantParam,
			quantityParam: () => quantityParam
		})
	)
</script>

<div class={cn('', className)}>
	{@render children()}
</div>
