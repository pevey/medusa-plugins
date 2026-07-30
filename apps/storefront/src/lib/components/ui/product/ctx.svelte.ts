import { getContext, setContext } from 'svelte'
import { SvelteURLSearchParams } from 'svelte/reactivity'
import { page } from '$app/state'
import * as logic from './product-logic.js'
import type { CalculatedPrice } from './format-price.js'
import type { StoreProduct, StoreProductVariant } from '@medusajs/types'

// The reactive product context, built by `createProductContext` from `$derived` values +
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
	/** Select a variant without navigating. No-op in `'url'` selection mode. */
	selectVariant: (variantId: string) => void
	/** Set quantity without navigating. No-op in `'url'` selection mode. */
	setQuantity: (n: number) => void
	/** True when selection lives in the URL, so parts should render links rather than buttons. */
	readonly navigable: boolean
	readonly priceMin: CalculatedPrice | null
	readonly priceMax: CalculatedPrice | null
	readonly hasPriceRange: boolean
}

/**
 * Builds a `ProductContext`.
 *
 * `selection: 'url'` (default) — selection lives in the URL (`?v=`, `?quantity=`), the
 * reactive source of truth via `$app/state`. Used by `Product.Root` on a detail page:
 * shareable, SSR-safe, back-button-correct.
 *
 * `selection: 'local'` — selection lives in component `$state`, seeded from the cheapest
 * purchasable variant. Used by `Product.Card`, where a grid of cards must not all read the
 * same `?v=` and swatches must not navigate.
 */
export function createProductContext(opts: {
	product: () => StoreProduct | null
	selection?: 'url' | 'local'
	/** Thunks, so a caller's prop stays reactive through the context. */
	variantParam?: () => string
	quantityParam?: () => string
}): ProductContext {
	const selection = opts.selection ?? 'url'

	const product = $derived(opts.product() ?? null)
	const variantParam = $derived(opts.variantParam?.() ?? 'v')
	const quantityParam = $derived(opts.quantityParam?.() ?? 'quantity')

	// Only read in 'local' mode. Empty/0 means "not yet chosen" → fall through to the seed.
	let localVariantId = $state('')
	let localQuantity = $state(0)

	const selectedVariantId = $derived.by(() => {
		if (selection === 'local') {
			if (localVariantId && product?.variants?.some(v => v.id === localVariantId)) return localVariantId
			return logic.cheapestPurchasableVariantId(product) ?? logic.defaultVariantId(product)
		}
		// A `?v=` that doesn't resolve to a real variant (stale/garbage) falls back to the
		// default rather than silently deselecting everything.
		const v = page.url.searchParams.get(variantParam)
		if (v && product?.variants?.some(variant => variant.id === v)) return v
		return logic.defaultVariantId(product)
	})

	const selectedVariant = $derived(product?.variants?.find(v => v.id === selectedVariantId) ?? null)

	// Stock-clamped on read so a stale ?quantity= against a low-stock variant reads correctly.
	const quantity = $derived.by(() => {
		if (selection === 'local') return logic.clampToStock(localQuantity || 1, selectedVariant)
		const raw = parseInt(page.url.searchParams.get(quantityParam) ?? '', 10)
		const n = Number.isFinite(raw) && raw >= 1 ? raw : 1
		return logic.clampToStock(n, selectedVariant)
	})

	const range = $derived(logic.priceRange(product))

	function buildParamHref(param: string, value: string): string {
		if (selection === 'local') return ''
		const sp = new SvelteURLSearchParams(page.url.searchParams.toString())
		if (value) sp.set(param, value)
		const q = sp.toString()
		return q ? `?${q}` : page.url.pathname
	}

	return {
		get product() {
			return product
		},
		get selectedVariant() {
			return selectedVariant
		},
		get selectedVariantId() {
			return selectedVariantId
		},
		get variantParam() {
			return variantParam
		},
		isSelected: valueId => logic.isSelected(selectedVariant, valueId),
		isAvailable: valueId => logic.isAvailable(product, selectedVariant, valueId),
		resolveVariant: (optionId, valueId) => logic.resolveVariant(product, selectedVariant, optionId, valueId),
		buildHref: variantId => buildParamHref(variantParam, variantId),
		get quantity() {
			return quantity
		},
		buildQuantityHref: n => buildParamHref(quantityParam, String(n)),
		get quantityParam() {
			return quantityParam
		},
		selectVariant: variantId => {
			if (selection === 'local') localVariantId = variantId
		},
		setQuantity: n => {
			if (selection === 'local') localQuantity = n
		},
		get navigable() {
			return selection === 'url'
		},
		get priceMin() {
			return range?.min ?? null
		},
		get priceMax() {
			return range?.max ?? null
		},
		get hasPriceRange() {
			return range != null && range.min.calculated_amount !== range.max.calculated_amount
		}
	}
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
