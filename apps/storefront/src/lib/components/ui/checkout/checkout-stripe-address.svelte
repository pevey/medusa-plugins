<script lang="ts">
	// Stripe AddressElement as an input-surface for <Address.Root>: it renders Stripe's address form
	// (their fraud/Radar signal) but feeds changes into the SAME address wiring (region switch, commit,
	// host seam) via `setAddressFromStripe`. Must sit inside BOTH a Stripe <Elements> and <Address.Root>.
	import { AddressElement } from 'sveltekit-stripe'
	import { getAddressContext } from '../address/ctx.svelte.js'

	let { class: className = '' }: { class?: string } = $props()

	const addr = getAddressContext()

	// Allowed delivery countries come from the address context (full shippable set, or — once
	// restrictToCurrentRegion lands — the current region's set). Stripe wants uppercase ISO-2.
	const allowedCountries = $derived((addr.countries ?? []).map((c) => c.code.toUpperCase()))

	function onChange(e: { complete?: boolean; value?: unknown }) {
		if (e?.complete) addr.setAddressFromStripe(e.value)
	}
</script>

<div data-checkout-stripe-address class={className}>
	<AddressElement
		addressElementOptions={{
			mode: 'shipping',
			allowedCountries,
			fields: { phone: 'always' },
			display: { name: 'split' }
		}}
		{onChange}
	/>
</div>
