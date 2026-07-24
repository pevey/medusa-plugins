<script lang="ts">
	import type { RemoteForm } from '@sveltejs/kit'
	import type { StoreCart } from '@medusajs/types'
	import Root from './address-root.svelte'
	import { getAddressContext } from './ctx.svelte.js'
	import Email from './address-email.svelte'
	import FirstName from './address-first-name.svelte'
	import LastName from './address-last-name.svelte'
	import Autocomplete from './address-autocomplete.svelte'
	import AddressLine1 from './address-line1.svelte'
	import Line2 from './address-line2.svelte'
	import Country from './address-country.svelte'
	import Province from './address-province.svelte'
	import PostalCode from './address-postal-code.svelte'
	import City from './address-city.svelte'
	import Phone from './address-phone.svelte'
	import type { GetCartFn, GetRegionsFn, UpdateCartFn, ProvinceConfig, AddressCommit } from './types.js'

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
		registerCommit?: (commit: AddressCommit) => void
		class?: string
	} = $props()
</script>

<Root {...props}>
	{@const ctx = getAddressContext()}
	<div class="grid grid-cols-2 gap-x-2">
		<div class="col-span-2"><Email /></div>
		<div class="col-span-2 md:col-span-1"><FirstName /></div>
		<div class="col-span-2 md:col-span-1"><LastName /></div>
		<!-- GPAC entry: only while collapsed; hidden once the structured block is revealed. -->
		{#if !ctx.expanded}
			<div class="col-span-2"><Autocomplete /></div>
		{/if}
	</div>

	<!-- Structured block: PRESENT-but-clipped while collapsed so browser autofill can fill it and
	     fire events (sr-only = clip, never display:none). tabindex -1 keeps keyboard focus out of the
	     invisible fields; autofill (programmatic) is unaffected by tabindex. -->
	<div
		data-collapsed-fields
		class={ctx.expanded ? 'grid grid-cols-2 gap-x-2' : 'sr-only'}
	>
		<div class="col-span-2"><AddressLine1 tabindex={ctx.expanded ? undefined : -1} /></div>
		<div class="col-span-2"><Line2 tabindex={ctx.expanded ? undefined : -1} /></div>
		<div class="col-span-2 md:col-span-1"><Country tabindex={ctx.expanded ? undefined : -1} /></div>
		<div class="col-span-2 md:col-span-1"><Province tabindex={ctx.expanded ? undefined : -1} /></div>
		<div class="col-span-2 md:col-span-1"><PostalCode tabindex={ctx.expanded ? undefined : -1} /></div>
		<div class="col-span-2 md:col-span-1"><City tabindex={ctx.expanded ? undefined : -1} /></div>
		<div class="col-span-2"><Phone tabindex={ctx.expanded ? undefined : -1} /></div>
	</div>
</Root>
