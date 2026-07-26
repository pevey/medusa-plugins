import type { RemoteForm } from '@sveltejs/kit'
import type { StoreCart, StoreOrder } from '@medusajs/types'

export type CheckoutLine = NonNullable<StoreCart['items']>[number]

export type UpdateAddress = () => Promise<StoreCart | null>
export type AuthorizePayment = () => Promise<{ ok: boolean; error?: unknown }>

// Shape the Root bridges the SDK's getCart query to, so it can read `.current` (like Cart.Root).
export type CartQuery = { current: StoreCart | null | undefined }

export type CheckoutContext = {
	readonly form: RemoteForm<any, any>
	readonly cart: StoreCart | null | undefined
	readonly placing: boolean
	readonly error: unknown
	readonly order: StoreOrder | null
	readonly shippingOptions: any[]
	/** Payment provider ids enabled for the cart's current region (from `region.payment_providers`). */
	readonly availableProviders: string[]
	hasProvider: (id: string) => boolean
	registerAddress: (fn: UpdateAddress) => void
	registerPayment: (fn: AuthorizePayment) => void
	registerShippingRefresh: (fn: () => void | Promise<void>) => void
	placeOrder: () => Promise<void>
	selectShipping: (optionId: string) => Promise<void>
	applyDiscount: (code: string) => Promise<void>
	removeDiscount: (code: string) => Promise<void>
	updateItem: (itemId: string, quantity: number) => Promise<void>
	removeItem: (itemId: string) => Promise<void>
}

export type CheckoutLineContext = { readonly item: CheckoutLine }
