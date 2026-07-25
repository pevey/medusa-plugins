<script lang="ts">
	// Stripe AddressElement as an input-surface for <Address.Root>: it renders Stripe's address form
	// (their fraud/Radar signal) but feeds changes into the SAME address wiring (region switch, commit,
	// host seam). Must sit inside BOTH a Stripe <Elements> and <Address.Root>.
	import { untrack } from 'svelte'
	import { AddressElement } from 'sveltekit-stripe'
	import { getAddressContext } from '../address/ctx.svelte.js'

	let { class: className = '' }: { class?: string } = $props()

	const addr = getAddressContext()

	// The cart's CURRENT country (reactive): a committed shipping country, else the current region's
	// first country. Used to detect a *user* country change (and to avoid a spurious switch on mount).
	const regionCountry = (): string =>
		(addr.regions ?? []).find((r) => r.id === addr.cart?.region_id)?.countries?.[0]?.iso_2 ?? ''
	const currentCountry = $derived(
		String(addr.cart?.shipping_address?.country_code ?? regionCountry()).toLowerCase()
	)

	// Options are captured ONCE (untrack) so the AddressElement is created a single time — recomputing
	// them on every cart update would recreate the element and drop in-progress input. Hydrated from the
	// cart's committed address so a refresh (and a swap into this surface) shows the right values, and
	// the default country matches the cart's region (so the mount `change` never switches the region).
	const options = untrack(() => {
		// Hydrate from the FORM (the source of truth), not the cart — Medusa blanks the cart's shipping
		// address on a region switch, so reading the cart here would wipe what the user typed just before
		// swapping into this surface. The shared form keeps it.
		const val = (n: string): string => addr.form.fields[n]?.value() ?? ''
		const country = String(val('country_code') || regionCountry() || 'us').toUpperCase()
		return {
			mode: 'shipping' as const,
			allowedCountries: (addr.countries ?? []).map((c) => c.code.toUpperCase()),
			fields: { phone: 'always' as const },
			display: { name: 'split' as const },
			defaultValues: {
				firstName: val('first_name') || undefined,
				lastName: val('last_name') || undefined,
				phone: val('phone') || undefined,
				address: {
					line1: val('address_1') || '',
					line2: val('address_2') || undefined,
					city: val('city') || '',
					state: val('province') || '',
					postal_code: val('postal_code') || '',
					country
				}
			}
		}
	})

	function onChange(e: { complete?: boolean; value?: any }) {
		const selected = String(e?.value?.address?.country ?? '').toLowerCase()
		// Switch region the moment the country changes (before the full address is complete) — this
		// persists the choice and drives CheckoutAuto's provider swap. `setRegionForCountry` also guards
		// against no-ops, so comparing to `currentCountry` just avoids redundant calls per keystroke.
		if (selected && selected !== currentCountry) addr.setRegionForCountry(selected)
		if (e?.complete) addr.setAddressFromStripe(e.value)
	}
</script>

<div data-checkout-stripe-address class={className}>
	<AddressElement addressElementOptions={options} {onChange} />
</div>
