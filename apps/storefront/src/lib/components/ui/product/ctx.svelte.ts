import { getContext, setContext } from 'svelte'
import type { StoreProduct, StoreProductVariant } from '@medusajs/types'

// The reactive product context. `Product.Root` builds this from `$derived` values +
// pure-logic wrappers (see product-logic.ts) — no `$effect`, so it works during SSR.
export type ProductContext = {
	readonly product: StoreProduct | null
	readonly selectedVariant: StoreProductVariant | null
	readonly selectedVariantId: string
	isSelected: (valueId: string) => boolean
	isAvailable: (valueId: string) => boolean
	resolveVariant: (optionId: string, valueId: string) => string
	buildHref: (variantId: string) => string
	variantParam: string
	readonly quantity: number
	buildQuantityHref: (quantity: number) => string
	quantityParam: string
}

const KEY = Symbol('product')

export function setProductContext(ctx: ProductContext) {
	setContext(KEY, ctx)
}

export function getProductContext(): ProductContext {
	const ctx = getContext<ProductContext>(KEY)
	if (!ctx) throw new Error('Product.* must be used within <Product.Root>')
	return ctx
}

// Non-throwing lookup for components that may render standalone (CTAs, QuantitySelect).
export function getProductContextOptional(): ProductContext | null {
	return getContext<ProductContext>(KEY) ?? null
}
