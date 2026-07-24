import type { CartAddress, UpdateCartArgs, Country } from './types'

export const ADDRESS_KEYS = [
	'first_name', 'last_name', 'address_1', 'address_2', 'city', 'province', 'postal_code', 'country_code', 'phone'
] as const

export type FieldGetter = (name: string) => string

/** Build a Medusa cart address from the form's field values, optionally from a `billing_` prefix. */
export function readAddress(get: FieldGetter, prefix = ''): CartAddress {
	const f = (n: string) => get(prefix + n) || ''
	return {
		first_name: f('first_name'),
		last_name: f('last_name'),
		address_1: f('address_1'),
		address_2: f('address_2'),
		city: f('city'),
		province: f('province'),
		postal_code: f('postal_code'),
		country_code: f('country_code'),
		phone: f('phone'),
		company: f('company') || undefined
	}
}

/** Build the updateCart payload; when billing is hidden it mirrors the shipping address. */
export function buildUpdatePayload(get: FieldGetter, showBilling: boolean): UpdateCartArgs {
	const shipping = readAddress(get, '')
	return {
		email: get('email') || undefined,
		shipping_address: shipping,
		billing_address: showBilling ? readAddress(get, 'billing_') : shipping
	}
}

/**
 * Map a country string (an iso_2 code OR a display name, e.g. from browser autofill) to the iso_2
 * code, using the store's country list. Case-insensitive; returns the input unchanged when empty
 * or unmatched (so manual, GPAC, and autofill entry all converge on the code the cart expects).
 */
export function resolveCountryValue(countries: Country[], value: string): string {
	if (!value) return value
	const v = value.toLowerCase()
	const match = countries.find((c) => c.code.toLowerCase() === v || c.name.toLowerCase() === v)
	return match ? match.code : value
}
