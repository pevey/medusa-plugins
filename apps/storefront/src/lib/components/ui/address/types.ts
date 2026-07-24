import type { RemoteForm } from '@sveltejs/kit'
import type { StoreCart, StoreRegion } from '@medusajs/types'
import type { ProvinceConfig } from '../input-province/provinces'
import type { NormalizedAddress } from '../google-places-autocomplete/types'

export type { ProvinceConfig }

export type CartAddress = {
	first_name: string
	last_name: string
	address_1: string
	address_2: string
	city: string
	province: string
	postal_code: string
	country_code: string
	phone: string
	company?: string
}

export type UpdateCartArgs = {
	email?: string
	region_id?: string
	shipping_address?: CartAddress
	billing_address?: CartAddress | Record<string, never>
	metadata?: Record<string, unknown>
}

// SDK remotes, typed structurally so tests inject plain fakes.
export type GetCartFn = () => { current: StoreCart | null | undefined; set?: (c: StoreCart) => void }
export type GetRegionsFn = () => Promise<StoreRegion[]> & { current: StoreRegion[] | undefined }
export type UpdateCartFn = (args: UpdateCartArgs) => Promise<StoreCart | null>

export type Country = { code: string; name: string }

export type AddressCommit = () => Promise<StoreCart | null>

export type AddressContext = {
	readonly form: RemoteForm<any, any>
	readonly cart: StoreCart | null | undefined
	readonly regions: StoreRegion[] | undefined
	readonly countries: Country[]
	readonly provinceConfig: ProvinceConfig
	readonly apiKey: string | undefined
	readonly isAutocomplete: boolean
	readonly billingSameAsShipping: boolean
	readonly showBilling: boolean
	readonly expanded: boolean
	setExpanded: (v: boolean) => void
	commit: AddressCommit
	onchange: (event: Event) => void
	save: () => Promise<void>
	setRegionForCountry: (code: string) => Promise<void>
	setBillingSameAsShipping: (same: boolean) => void
	setAddressFromAutocomplete: (addr: NormalizedAddress, prefix?: string) => Promise<void>
}
