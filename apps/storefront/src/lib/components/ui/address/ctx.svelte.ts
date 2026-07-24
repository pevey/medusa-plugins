import { getContext, setContext } from 'svelte'
import type { AddressContext } from './types.js'

const ADDRESS = Symbol('address')

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
