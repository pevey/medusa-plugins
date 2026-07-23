import type { StoreCart } from '@medusajs/types'
import type { CartLine, LineHrefFn } from './types.js'

export function totalQuantity(cart: StoreCart | null | undefined): number {
	return (cart?.items ?? []).reduce((n, li) => n + (li.quantity ?? 0), 0)
}
export function lineCount(cart: StoreCart | null | undefined): number {
	return cart?.items?.length ?? 0
}
export function subtotal(cart: StoreCart | null | undefined): number | undefined {
	return (cart as { item_subtotal?: number } | null | undefined)?.item_subtotal ?? undefined
}
export const defaultLineHref: LineHrefFn = (item: CartLine) =>
	`/product/${item.product_handle}${item.variant_id ? `?variant=${item.variant_id}` : ''}`
