<script lang="ts">
	import type { RemoteForm } from '@sveltejs/kit'
	import type { StoreOrder } from '@medusajs/types'
	// Provider-agnostic checkout address form/schema (reused as-is; a neutral alias is a later cleanup).
	import { braintreeCheckoutForm } from 'sveltekit-medusa-sdk'
	import Root from './checkout.svelte'
	import Body from './checkout-stripe-body.svelte'

	interface Props {
		form?: RemoteForm<any, any>
		/** Stripe publishable key (pk_...). */
		publishableKey: string
		/** Medusa Stripe provider id (default `pp_stripe_stripe`). */
		providerId?: string
		/** Required by Stripe's confirmPayment (even with redirect:'if_required'). */
		returnUrl: string
		restrictToCurrentRegion?: boolean
		navigate?: (url: string) => void | Promise<void>
		redirectTo?: string | ((order: StoreOrder) => string)
		oncomplete?: (order: StoreOrder) => void
		onerror?: (err: unknown) => void
		class?: string
	}
	let {
		form = braintreeCheckoutForm as unknown as RemoteForm<any, any>,
		publishableKey,
		providerId,
		returnUrl,
		restrictToCurrentRegion,
		...rest
	}: Props = $props()
</script>

<form {...form}>
	<Root {form} {...rest}>
		<Body {form} {publishableKey} {providerId} {returnUrl} {restrictToCurrentRegion} />
	</Root>
</form>
