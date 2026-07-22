<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { page } from '$app/state'
	import { setProductContext } from './ctx.svelte.js'
	import * as logic from './product-logic.js'
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
		class?: string
		children: Snippet
	}
	let { product, variantParam = 'v', class: className = '', children }: Props = $props()

	// Everything is `$derived` (no `$effect`) so it works during SSR. Selection lives in the
	// URL (`?v=`), which is the reactive source of truth via `$app/state`.
	const resolvedProduct = $derived(product ?? null)
	// A `?v=` that doesn't resolve to a real variant (stale/garbage) falls back to the
	// default rather than silently deselecting everything.
	const selectedVariantId = $derived.by(() => {
		const v = page.url.searchParams.get(variantParam)
		if (v && resolvedProduct?.variants?.some((variant) => variant.id === v)) return v
		return logic.defaultVariantId(resolvedProduct)
	})
	const selectedVariant = $derived(
		resolvedProduct?.variants?.find((v) => v.id === selectedVariantId) ?? null
	)

	function buildHref(variantId: string): string {
		const sp = new URLSearchParams(page.url.searchParams.toString())
		if (variantId) sp.set(variantParam, variantId)
		const q = sp.toString()
		return q ? `?${q}` : page.url.pathname
	}

	// Reactive context via getters (no `$effect`, no `$state` sync) — SSR-safe.
	setProductContext({
		get product() {
			return resolvedProduct
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
		isSelected: (valueId) => logic.isSelected(selectedVariant, valueId),
		isAvailable: (valueId) => logic.isAvailable(resolvedProduct, selectedVariant, valueId),
		resolveVariant: (optionId, valueId) =>
			logic.resolveVariant(resolvedProduct, selectedVariant, optionId, valueId),
		buildHref
	})
</script>

<div class={cn('', className)}>
	{@render children()}
</div>
