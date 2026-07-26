<script lang="ts">
	import { onMount } from 'svelte'
	// Static imports (browser-only SDK — see the Braintree lesson). This component is NOT unit-tested;
	// it only renders inside a Stripe <Elements> boundary (see checkout-stripe-elements.svelte).
	import { PaymentElement, getStripeContext } from 'sveltekit-stripe'
	import { cn } from '$lib/utils.js'
	import { getCheckoutContextOptional } from './ctx.svelte.js'

	interface Props {
		/** Stripe requires a return_url for confirmPayment (even with redirect:'if_required'). */
		returnUrl: string
		class?: string
	}
	let { returnUrl, class: className = '' }: Props = $props()

	const ctx = getCheckoutContextOptional()
	const stripe = getStripeContext()

	async function authorizePayment() {
		try {
			if (!stripe.stripe || !stripe.elements)
				return { ok: false, error: new Error('Payment not ready') }
			// clientSecret is bound to the Elements instance (created with it), so confirmPayment infers
			// it from `elements`. `redirect: 'if_required'` keeps the card path inline (no redirect page).
			const { error } = await stripe.stripe.confirmPayment({
				elements: stripe.elements,
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
