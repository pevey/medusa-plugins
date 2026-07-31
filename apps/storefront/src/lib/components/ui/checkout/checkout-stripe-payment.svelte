<script lang="ts">
	import { onMount } from 'svelte'
	// Static imports (browser-only SDK — see the Braintree lesson). This component is NOT unit-tested;
	// it only renders inside a Stripe <Elements> boundary (see checkout-stripe-elements.svelte).
	import { PaymentElement, getStripeContext } from 'sveltekit-stripe'
	import { cn } from '$lib/utils.js'
	import { getCheckoutContextOptional } from './ctx.svelte.js'
	import { getStripeSessionContext } from './stripe-cs-context.js'

	interface Props {
		/** Stripe requires a return_url for confirmPayment (even with redirect:'if_required'). */
		returnUrl: string
		class?: string
	}
	let { returnUrl, class: className = '' }: Props = $props()

	const ctx = getCheckoutContextOptional()
	const stripe = getStripeContext()
	const session = getStripeSessionContext()

	async function authorizePayment() {
		try {
			if (!stripe.stripe || !stripe.elements) return { ok: false, error: new Error('Payment not ready') }

			// Stripe's deferred-intent order, and it matters:
			//   1. elements.submit() — validate + collect while the total is still what the shopper saw
			//   2. create the PaymentIntent against that final total (Medusa would have deleted any
			//      session made earlier, so this is the first and only one)
			//   3. confirm with the secret from step 2
			const { error: submitError } = await stripe.elements.submit()
			if (submitError) return { ok: false, error: submitError }

			const clientSecret = await session.ensureClientSecret()
			if (!clientSecret) return { ok: false, error: new Error('Could not start the payment session') }

			// `redirect: 'if_required'` keeps the card path inline (no redirect page).
			const { error } = await stripe.stripe.confirmPayment({
				elements: stripe.elements,
				clientSecret,
				confirmParams: { return_url: returnUrl },
				redirect: 'if_required'
			})
			if (error) return { ok: false, error }
			return { ok: true }
		} catch (e) {
			return { ok: false, error: e }
		}
	}

	onMount(() => {
		ctx?.registerPayment(authorizePayment)
	})
</script>

<section data-checkout-stripe-payment class={cn('', className)}>
	<PaymentElement />
</section>
