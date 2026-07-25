<script lang="ts">
	// Thin wallet button (Apple/Google Pay/Link) for product cards / landing pages, in Stripe DEFERRED
	// mode (Elements created with mode/amount/currency — no clientSecret). Renders the Express Checkout
	// wallet button; a tap opens the native wallet sheet immediately (least friction). Medusa-agnostic:
	// YOU create the PaymentIntent on `confirm` (server-side) and call the provided `confirm(clientSecret)`
	// helper — the component holds the Elements, so it runs `confirmPayment` for you.
	//
	// APPLE PAY: register your domain up front (Stripe Dashboard → Payment methods → Apple Pay → Web
	// domains); the Express Checkout Element does NOT auto-register.
	import { Elements, ExpressCheckout } from 'sveltekit-stripe'
	import type { PaymentIntentResult } from '@stripe/stripe-js'

	interface ConfirmArgs {
		event: unknown
		/** Finish the payment with a clientSecret you just created server-side (the component holds the
		 *  Elements). Extra confirmParams (e.g. shipping) merge over the default `return_url`. */
		confirm: (
			clientSecret: string,
			confirmParams?: Record<string, unknown>
		) => Promise<PaymentIntentResult>
	}

	let {
		publishableKey,
		amount,
		currency,
		options,
		returnUrl,
		onConfirm,
		onReady,
		onClick,
		onCancel,
		class: className = ''
	}: {
		/** Stripe publishable key (pk_...). */
		publishableKey: string
		/** Total in the smallest currency unit (integer, e.g. 1999 = $19.99). */
		amount: number
		/** ISO currency, e.g. 'usd'. */
		currency: string
		/** Passed straight to the Express Checkout element (buttonType, layout, wallets, …). */
		options?: Record<string, unknown>
		/** confirmPayment `return_url` (defaults to the current page). */
		returnUrl?: string
		/** Tap → wallet → here. Create the PaymentIntent, then call `confirm(clientSecret)`. */
		onConfirm: (args: ConfirmArgs) => void | Promise<void>
		onReady?: (e: unknown) => void
		onClick?: (e: unknown) => void
		onCancel?: () => void
		class?: string
	} = $props()
</script>

<div data-stripe-express-checkout class={className}>
	<Elements publicKey={publishableKey} elementsOptions={{ mode: 'payment', amount, currency } as any}>
		{#snippet children({ stripe, elements })}
			<ExpressCheckout
				expressCheckoutOptions={options as any}
				{onReady}
				{onClick}
				{onCancel}
				onConfirm={(event) =>
					onConfirm({
						event,
						confirm: async (clientSecret, confirmParams) => {
							// Deferred mode requires submit() to validate + collect before confirming.
							const { error: submitError } = await elements!.submit()
							if (submitError) return { error: submitError } as PaymentIntentResult
							return stripe!.confirmPayment({
								elements: elements!,
								clientSecret,
								confirmParams: {
									return_url: returnUrl ?? (typeof location !== 'undefined' ? location.href : ''),
									...(confirmParams ?? {})
								},
								redirect: 'if_required'
							})
						}
					})}
			/>
		{/snippet}
	</Elements>
</div>
