<script lang="ts">
	// The Stripe elements:FALSE checkout body — granular, self-styled components (split card fields /
	// StripeIdeal) over the GPAC AddressForm, instead of Stripe's all-in-one PaymentElement/AddressElement.
	// Sibling of checkout-stripe-body.svelte (elements:true); the switcher renders THIS when the resolved
	// provider's config has `elements: false`. Payment is routed by `resolveStripeMethod(providerId)`.
	import type { RemoteForm } from '@sveltejs/kit'
	import Items from './checkout-items.svelte'
	import Image from './checkout-image.svelte'
	import Title from './checkout-title.svelte'
	import ItemSubtotal from './checkout-item-subtotal.svelte'
	import Delivery from './checkout-delivery.svelte'
	import Discount from './checkout-discount.svelte'
	import Summary from './checkout-summary.svelte'
	import Subtotal from './checkout-summary-subtotal.svelte'
	import SummaryDiscount from './checkout-summary-discount.svelte'
	import Shipping from './checkout-summary-shipping.svelte'
	import Tax from './checkout-summary-tax.svelte'
	import Total from './checkout-summary-total.svelte'
	import StripeElements from './checkout-stripe-elements.svelte'
	import StripeCard from './checkout-stripe-card.svelte'
	import StripeIdealPayment from './checkout-stripe-ideal.svelte'
	import StripeExpress from './checkout-stripe-express.svelte'
	import PlaceOrder from './checkout-place-order.svelte'
	import Confirmation from './checkout-confirmation.svelte'
	import CheckoutError from './checkout-error.svelte'
	import { AddressForm } from '../address/index.js'
	import { resolveStripeMethod } from './checkout-logic.js'

	let {
		form,
		publishableKey,
		providerId,
		returnUrl,
		restrictToCurrentRegion,
		googlePlacesApiKey,
		allowExpressCheckout = true
	}: {
		form: RemoteForm<any, any>
		publishableKey: string
		providerId?: string
		returnUrl: string
		restrictToCurrentRegion?: boolean
		googlePlacesApiKey?: string
		allowExpressCheckout?: boolean
	} = $props()

	const method = $derived(resolveStripeMethod(providerId ?? 'pp_stripe_stripe'))
</script>

<StripeElements {publishableKey} {providerId}>
	{#if allowExpressCheckout && method === 'card'}
		<!-- Apple/Google Pay express path (region-locked). Renders itself only when a wallet is available. -->
		<div class="mx-auto max-w-5xl px-4 pt-4"><StripeExpress {returnUrl} /></div>
	{/if}
	<div class="mx-auto grid max-w-5xl gap-8 p-4 md:grid-cols-2">
		<div class="space-y-4">
			<AddressForm {form} {googlePlacesApiKey} {restrictToCurrentRegion} />
		</div>
		<div class="space-y-6">
			<Items>
				<Image /><Title /><ItemSubtotal />
			</Items>
			<Delivery />
			<Discount />
			<Summary>
				<Subtotal /><SummaryDiscount /><Shipping /><Tax /><Total />
			</Summary>
			{#if method === 'card'}
				<StripeCard />
			{:else if method === 'ideal'}
				<StripeIdealPayment {returnUrl} />
			{:else}
				{@const _warn =
					import.meta.env.DEV &&
					console.error(
						`[CheckoutAuto] elements:false: provider "${providerId}" is not wired`
					)}
			{/if}
			<CheckoutError />
			<PlaceOrder />
		</div>
	</div>
</StripeElements>
<Confirmation />
