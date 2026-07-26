import type { StoreCart } from '@medusajs/types'

// The line-item shape actually carried by StoreCart.items (robust to the exported name).
export type CartLine = NonNullable<StoreCart['items']>[number]

export type CartCondition = {
	variantId?: string
	productId?: string
	productSlug?: string
	collectionTitle?: string
	minQuantity?: number
}
