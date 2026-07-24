<script lang="ts">
	import type { RemoteForm } from '@sveltejs/kit'
	import type { StoreCart } from '@medusajs/types'
	import Root from './address-root.svelte'
	import Email from './address-email.svelte'
	import FirstName from './address-first-name.svelte'
	import LastName from './address-last-name.svelte'
	import Autocomplete from './address-autocomplete.svelte'
	import Line2 from './address-line2.svelte'
	import Country from './address-country.svelte'
	import Province from './address-province.svelte'
	import PostalCode from './address-postal-code.svelte'
	import City from './address-city.svelte'
	import Phone from './address-phone.svelte'
	import BillingToggle from './address-billing-toggle.svelte'
	import Billing from './address-billing.svelte'
	import type { GetCartFn, GetRegionsFn, UpdateCartFn, ProvinceConfig } from './types.js'

	let props: {
		form: RemoteForm<any, any>
		apiKey?: string
		provinceConfig?: ProvinceConfig
		getCart?: GetCartFn
		getRegions?: GetRegionsFn
		updateCart?: UpdateCartFn
		debounceMs?: number
		onaddresschange?: (cart: StoreCart) => void
		onregionchange?: (regionId: string, country: string) => void
		onerror?: (err: unknown) => void
		class?: string
	} = $props()
</script>

<Root {...props}>
	<div class="grid grid-cols-2 gap-x-2">
		<div class="col-span-2"><Email /></div>
		<div class="col-span-2 md:col-span-1"><FirstName /></div>
		<div class="col-span-2 md:col-span-1"><LastName /></div>
		<div class="col-span-2"><Autocomplete /></div>
		<div class="col-span-2"><Line2 /></div>
		<div class="col-span-2 md:col-span-1"><Country /></div>
		<div class="col-span-2 md:col-span-1"><Province /></div>
		<div class="col-span-2 md:col-span-1"><PostalCode /></div>
		<div class="col-span-2 md:col-span-1"><City /></div>
		<div class="col-span-2"><Phone /></div>
	</div>
	<BillingToggle />
	<Billing />
</Root>
