import type { StoreCart } from '@medusajs/types'

// The line-item shape actually carried by StoreCart.items (robust to the exported name).
export type CartLine = NonNullable<StoreCart['items']>[number]

// SDK remote signatures (see sveltekit-sdk/src/lib/cart.remote.ts). All optional on components,
// defaulting to the real remotes.
export type AddToCartFn = (args: { variant_id: string; quantity: number }) => Promise<StoreCart>
export type RemoveFromCartFn = (lineId: string) => Promise<StoreCart | null>
export type GetCartFn = () => Promise<StoreCart | null>

export type CartCondition = {
	variantId?: string
	productId?: string
	productSlug?: string
	collectionTitle?: string
	minQuantity?: number
}
