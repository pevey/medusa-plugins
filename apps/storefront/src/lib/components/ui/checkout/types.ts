import type { RemoteForm } from '@sveltejs/kit'
import type { StoreCart, StoreOrder } from '@medusajs/types'

export type CheckoutLine = NonNullable<StoreCart['items']>[number]

export type UpdateAddress = () => Promise<StoreCart | null>
export type AuthorizePayment = () => Promise<{ ok: boolean; error?: unknown }>

// SDK remotes, typed structurally so tests inject fakes.
export type CartQuery = { current: StoreCart | null | undefined }
export type GetCartFn = () => CartQuery
export type UpdateCartItemFn = (args: { item_id: string; quantity: number }) => Promise<StoreCart | null>
export type RemoveFromCartFn = (lineId: string) => Promise<StoreCart | null>
export type GetShippingOptionsFn = () => Promise<any[]> & { current?: any[] }
export type SelectShippingOptionFn = (optionId: string) => Promise<StoreCart | null>
export type AddPromotionFn = (code: string) => Promise<StoreCart | null>
export type RemovePromotionFn = (code: string) => Promise<StoreCart | null>
export type InitiateBraintreeFn = (args: { provider_id: string; data?: { payment_method_nonce?: string; deviceData?: string } }) => Promise<any>
export type CompleteCartFn = () => Promise<StoreOrder | StoreCart | null>

export type CheckoutContext = {
	readonly form: RemoteForm<any, any>
	readonly cart: StoreCart | null | undefined
	readonly placing: boolean
	readonly error: unknown
	readonly order: StoreOrder | null
	readonly shippingOptions: any[]
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
