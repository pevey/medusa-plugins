import { getContext, setContext } from 'svelte'
import type { StoreCart } from '@medusajs/types'
import type { AddressContext } from './types.js'

const ADDRESS = Symbol('address')
const ADDRESS_HOST = Symbol('address-host')

export function setAddressContext(ctx: AddressContext) {
	setContext(ADDRESS, ctx)
}
export function getAddressContext(): AddressContext {
	const ctx = getContext<AddressContext>(ADDRESS)
	if (!ctx) throw new Error('Address.* must be used within <Address.Root>')
	return ctx
}
export function getAddressContextOptional(): AddressContext | null {
	return getContext<AddressContext>(ADDRESS) ?? null
}

// Optional host-registration seam: a consumer (e.g. Checkout.Root) that wraps Address can register
// itself here to receive Address's `updateAddress` once mounted, and be notified of every committed
// address/region change — all without Address importing Checkout.
export type AddressHost = {
	registerUpdateAddress?: (updateAddress: () => Promise<StoreCart | null>) => void
	// Called after every committed cart update (address edit, region switch), so a host like
	// Checkout.Root can react — e.g. re-fetch shipping options, which depend on the shipping address.
	onAddressChange?: (cart: StoreCart) => void
}
export function setAddressHost(host: AddressHost) {
	setContext(ADDRESS_HOST, host)
}
export function getAddressHostOptional(): AddressHost | null {
	return getContext<AddressHost>(ADDRESS_HOST) ?? null
}
