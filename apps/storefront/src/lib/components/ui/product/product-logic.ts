import type { StoreProduct, StoreProductVariant } from '@medusajs/types'

// Pure variant-resolution + inventory-availability logic (no runes, no $app) so it is
// trivially unit-testable. `Product.Root` wires these into reactive `$derived` context.

// In stock when inventory isn't managed, or the managed quantity is positive.
export function inStock(
	v: Pick<StoreProductVariant, 'manage_inventory' | 'inventory_quantity'>
): boolean {
	return v.manage_inventory === false || (v.inventory_quantity ?? 0) > 0
}

// Map of option_id -> selected value_id for a variant (keyed by the option each value
// belongs to — NOT by array position, which isn't guaranteed to match product.options).
export function selectedByOption(variant: StoreProductVariant | null): Map<string, string> {
	const m = new Map<string, string>()
	for (const o of variant?.options ?? []) if (o.option_id) m.set(o.option_id, o.id)
	return m
}

export function optionIdOfValue(product: StoreProduct | null, valueId: string): string | undefined {
	return product?.options?.find((o) => o.values?.some((v) => v.id === valueId))?.id
}

function variantForValueIds(product: StoreProduct | null, valueIds: string[]): string | undefined {
	return product?.variants?.find((v) => {
		const ids = v.options?.map((o) => o.id) ?? []
		return valueIds.every((id) => ids.includes(id))
	})?.id
}

// Highest-ranked (lowest rank) value per option → its variant; else the first variant.
export function defaultVariantId(product: StoreProduct | null): string {
	if (!product?.variants?.length) return ''
	if (product.options?.length) {
		const top = product.options
			.map((o) => [...(o.values ?? [])].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))[0]?.id)
			.filter(Boolean) as string[]
		const match = variantForValueIds(product, top)
		if (match) return match
	}
	return product.variants[0].id
}

export function isSelected(selectedVariant: StoreProductVariant | null, valueId: string): boolean {
	return selectedVariant?.options?.some((o) => o.id === valueId) ?? false
}

// The variant you'd land on by picking `valueId` for its option while keeping the current
// selections for the OTHER options; falls back to any variant containing the value.
export function resolveVariant(
	product: StoreProduct | null,
	selectedVariant: StoreProductVariant | null,
	optionId: string,
	valueId: string
): string {
	const target = new Map(selectedByOption(selectedVariant))
	target.set(optionId, valueId)
	return (
		variantForValueIds(product, [...target.values()]) ??
		product?.variants?.find((v) => v.options?.some((o) => o.id === valueId))?.id ??
		''
	)
}

// Some IN-STOCK variant contains `valueId` AND matches the current selections for the
// OTHER options (relative availability).
export function isAvailable(
	product: StoreProduct | null,
	selectedVariant: StoreProductVariant | null,
	valueId: string
): boolean {
	const optId = optionIdOfValue(product, valueId)
	const others = [...selectedByOption(selectedVariant).entries()]
		.filter(([oid]) => oid !== optId)
		.map(([, vid]) => vid)
	return (
		product?.variants?.some((v) => {
			const ids = v.options?.map((o) => o.id) ?? []
			return ids.includes(valueId) && others.every((sel) => ids.includes(sel)) && inStock(v)
		}) ?? false
	)
}

// Purchasable = a variant is selected AND it can be bought now (unmanaged, backorderable,
// or positive managed stock). Distinct from `inStock` (which ignores backorder) so option
// availability display is unchanged.
export function isPurchasable(variant: StoreProductVariant | null): boolean {
	if (!variant) return false
	if (variant.manage_inventory === false) return true
	if (variant.allow_backorder) return true
	return (variant.inventory_quantity ?? 0) > 0
}

// The inclusive upper bound for a quantity control: capped to managed stock when the variant
// is stock-limited (managed & no backorder), otherwise the caller's `max`.
export function effectiveMax(variant: StoreProductVariant | null, max: number): number {
	if (variant && variant.manage_inventory !== false && !variant.allow_backorder) {
		return Math.min(variant.inventory_quantity ?? 0, max)
	}
	return max
}

// The list of selectable quantities: min, min+step, … ≤ effectiveMax. Empty when out of stock.
export function quantityRange(
	variant: StoreProductVariant | null,
	opts: { min: number; step: number; max: number }
): number[] {
	const hi = effectiveMax(variant, opts.max)
	const out: number[] = []
	for (let n = opts.min; n <= hi; n += opts.step) out.push(n)
	return out
}

// Clamp `n` into [min, hi]; when hi < min (empty range / OOS) fall back to min.
export function clampQuantity(n: number, min: number, hi: number): number {
	if (hi < min) return min
	return Math.min(Math.max(n, min), hi)
}

// Clamp a URL-supplied quantity against a variant's managed stock (floor 1). No-op when the
// variant isn't stock-limited. Lets `Product.Root` expose a quantity the button can trust.
export function clampToStock(n: number, variant: StoreProductVariant | null): number {
	if (variant && variant.manage_inventory !== false && !variant.allow_backorder) {
		return Math.max(1, Math.min(n, variant.inventory_quantity ?? 0))
	}
	return Math.max(1, n)
}
