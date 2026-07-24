<script lang="ts">
	import type { RemoteForm } from '@sveltejs/kit'
	import type { StoreOrder } from '@medusajs/types'
	import { braintreeCheckoutForm } from 'sveltekit-medusa-sdk'
	import Root from './checkout.svelte'
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
	import BraintreePayment from './checkout-braintree-payment.svelte'
	import PlaceOrder from './checkout-place-order.svelte'
	import Confirmation from './checkout-confirmation.svelte'
	import CheckoutError from './checkout-error.svelte'
	import { AddressForm } from '../address/index.js'
	import type {
		GetCartFn, UpdateCartItemFn, RemoveFromCartFn, GetShippingOptionsFn, SelectShippingOptionFn,
		AddPromotionFn, RemovePromotionFn, CompleteCartFn
	} from './types.js'

	interface Props {
		form?: RemoteForm<any, any>
		googlePlacesApiKey?: string
		getCart?: GetCartFn
		updateCartItem?: UpdateCartItemFn
		removeFromCart?: RemoveFromCartFn
		getShippingOptions?: GetShippingOptionsFn
		selectShippingOption?: SelectShippingOptionFn
		addPromotion?: AddPromotionFn
		removePromotion?: RemovePromotionFn
		completeCart?: CompleteCartFn
		navigate?: (url: string) => void | Promise<void>
		redirectTo?: string | ((order: StoreOrder) => string)
		oncomplete?: (order: StoreOrder) => void
		onerror?: (err: unknown) => void
		class?: string
	}
	let { form = braintreeCheckoutForm as unknown as RemoteForm<any, any>, googlePlacesApiKey, ...rest }: Props = $props()
</script>

<form {...form}>
	<Root {form} {...rest}>
		<div class="mx-auto grid max-w-5xl gap-8 p-4 md:grid-cols-2">
			<div><AddressForm {form} {googlePlacesApiKey} /></div>
			<div class="space-y-6">
				<Items>
					<Image /><Title /><ItemSubtotal />
				</Items>
				<Delivery />
				<Discount />
				<Summary>
					<Subtotal /><SummaryDiscount /><Shipping /><Tax /><Total />
				</Summary>
				<BraintreePayment />
				<CheckoutError />
				<PlaceOrder />
			</div>
		</div>
		<Confirmation />
	</Root>
</form>
