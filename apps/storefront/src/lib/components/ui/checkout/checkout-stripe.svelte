<script lang="ts">
	import type { RemoteForm } from '@sveltejs/kit'
	import type { StoreOrder } from '@medusajs/types'
	// Provider-agnostic checkout address form/schema (reused as-is; a neutral alias is a later cleanup).
	import { braintreeCheckoutForm } from 'sveltekit-medusa-sdk'
	import Root from './checkout.svelte'
	import Body from './checkout-stripe-body.svelte'
	import type {
		GetCartFn, UpdateCartItemFn, RemoveFromCartFn, GetShippingOptionsFn, SelectShippingOptionFn,
		AddPromotionFn, RemovePromotionFn, CompleteCartFn, InitiatePaymentSessionFn
	} from './types.js'

	interface Props {
		form?: RemoteForm<any, any>
		/** Stripe publishable key (pk_...). */
		publishableKey: string
		/** Required by Stripe's confirmPayment (even with redirect:'if_required'). */
		returnUrl: string
		restrictToCurrentRegion?: boolean
		initiatePaymentSession?: InitiatePaymentSessionFn
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
	let {
		form = braintreeCheckoutForm as unknown as RemoteForm<any, any>,
		publishableKey,
		returnUrl,
		restrictToCurrentRegion,
		initiatePaymentSession,
		...rest
	}: Props = $props()
</script>

<form {...form}>
	<Root {form} {...rest}>
		<Body {form} {publishableKey} {returnUrl} {restrictToCurrentRegion} {initiatePaymentSession} />
	</Root>
</form>
