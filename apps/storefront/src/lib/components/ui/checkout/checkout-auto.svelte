<script lang="ts">
	// Region-driven checkout: renders whichever payment provider the cart's current region is
	// configured for (from region.payment_providers). Bundles all supported provider bodies, so it
	// pulls both payment deps — expected for an autoswap preset. `config` passes per-provider options
	// down, keyed by the full Medusa provider id.
	import type { RemoteForm } from '@sveltejs/kit'
	import type { StoreOrder } from '@medusajs/types'
	import { braintreeCheckoutForm } from 'sveltekit-medusa-sdk'
	import Root from './checkout.svelte'
	import AutoSwitch from './checkout-auto-switch.svelte'

	type ProviderConfig = { elements?: boolean }

	interface Props {
		form?: RemoteForm<any, any>
		/** Per-provider config, e.g. { pp_stripe_stripe: { elements: true } }. */
		config?: Record<string, ProviderConfig | undefined>
		/** Google Places key for the Braintree path's AddressForm autocomplete. */
		googlePlacesApiKey?: string
		/** Stripe publishable key (needed when a region uses Stripe). */
		publishableKey?: string
		/** Stripe confirmPayment return_url (needed when a region uses Stripe). */
		returnUrl?: string
		restrictToCurrentRegion?: boolean
		/** Show the Apple/Google Pay Express Checkout button (elements:false card path only). Default true. */
		allowExpressCheckout?: boolean
		navigate?: (url: string) => void | Promise<void>
		redirectTo?: string | ((order: StoreOrder) => string)
		oncomplete?: (order: StoreOrder) => void
		onerror?: (err: unknown) => void
		class?: string
	}
	let {
		form = braintreeCheckoutForm as unknown as RemoteForm<any, any>,
		config,
		googlePlacesApiKey,
		publishableKey,
		returnUrl,
		restrictToCurrentRegion,
		allowExpressCheckout = true,
		...rest
	}: Props = $props()
</script>

<form {...form}>
	<Root {form} {...rest}>
		<AutoSwitch {form} {config} {googlePlacesApiKey} {publishableKey} {returnUrl} {restrictToCurrentRegion} {allowExpressCheckout} />
	</Root>
</form>
