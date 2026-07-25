<script lang="ts">
	// The Braintree checkout body (everything inside <Checkout.Root>). Shared by the CheckoutBraintree
	// preset and the CheckoutAuto switcher so the layout lives in one place.
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
	import BraintreeHostedFields from './checkout-braintree-hosted-fields.svelte'
	import BraintreePayment from './checkout-braintree-payment.svelte'
	import PlaceOrder from './checkout-place-order.svelte'
	import Confirmation from './checkout-confirmation.svelte'
	import CheckoutError from './checkout-error.svelte'
	import { AddressForm } from '../address/index.js'

	let {
		form,
		googlePlacesApiKey,
		restrictToCurrentRegion
	}: {
		form: RemoteForm<any, any>
		googlePlacesApiKey?: string
		restrictToCurrentRegion?: boolean
	} = $props()
</script>

<div class="mx-auto grid max-w-5xl gap-8 p-4 md:grid-cols-2">
	<div><AddressForm {form} {googlePlacesApiKey} {restrictToCurrentRegion} /></div>
	<div class="space-y-6">
		<Items>
			<Image /><Title /><ItemSubtotal />
		</Items>
		<Delivery />
		<Discount />
		<Summary>
			<Subtotal /><SummaryDiscount /><Shipping /><Tax /><Total />
		</Summary>
		<BraintreeHostedFields>
			<BraintreePayment />
		</BraintreeHostedFields>
		<CheckoutError />
		<PlaceOrder />
	</div>
</div>
<Confirmation />
