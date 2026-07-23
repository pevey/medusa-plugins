import type { StoreCart } from '@medusajs/types'
import type { CartCondition, CartLine } from './types.js'
import type { ProductContext } from '../product/ctx.svelte.js'

// props > context > default. `||` so an empty context variant id ('' when no variants) → undefined.
export function resolveVariantId(propId: string | undefined, ctx: ProductContext | null): string | undefined {
	return propId || ctx?.selectedVariantId || undefined
}

export function resolveQuantity(propQty: number | undefined, ctx: ProductContext | null): number {
	return propQty ?? ctx?.quantity ?? 1
}

export function findCartLine(cart: StoreCart | null, variantId: string | undefined): CartLine | undefined {
	if (!cart || !variantId) return undefined
	return cart.items?.find((li) => li.variant_id === variantId)
}

function lineMatches(li: CartLine, c: CartCondition): boolean {
	if (c.variantId) return li.variant_id === c.variantId
	if (c.productId) return li.product_id === c.productId
	if (c.productSlug) return li.product_handle === c.productSlug
	if (c.collectionTitle) return (li.product_collection ?? '').toLowerCase() === c.collectionTitle.toLowerCase()
	return false
}

// True when cart lines matching the condition total ≥ minQuantity (default 1). Cheap fields only.
export function cartSatisfiesCondition(cart: StoreCart | null, condition: CartCondition): boolean {
	const min = condition.minQuantity ?? 1
	const total = (cart?.items ?? []).reduce(
		(sum, li) => (lineMatches(li, condition) ? sum + (li.quantity ?? 0) : sum),
		0
	)
	return total >= min
}
