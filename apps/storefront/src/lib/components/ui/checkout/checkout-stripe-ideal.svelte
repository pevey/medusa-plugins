<script lang="ts">
	// elements:false iDEAL payment. Renders NO input: the account-holder name comes from the address form
	// (first + last name, which the checkout form already requires), and the bank is chosen on Stripe's
	// redirect page. On place-order it confirms → the browser redirects to the bank → /checkout/return.
	import { onMount } from 'svelte'
	import { getStripeContext, confirmIdealPayment } from 'sveltekit-stripe'
	import { cn } from '$lib/utils.js'
	import { getCheckoutContextOptional } from './ctx.svelte.js'
	import { getStripeSessionContext } from './stripe-cs-context.js'
	import { cartBillingDetails } from './checkout-logic.js'

	let {
		returnUrl,
		note = 'You’ll be redirected to your bank to authorize the payment.',
		class: className = ''
	}: { returnUrl: string; note?: string; class?: string } = $props()
	const ctx = getCheckoutContextOptional()
	const stripe = getStripeContext()
	const session = getStripeSessionContext()

	async function authorizePayment() {
		try {
			if (!stripe.stripe || !stripe.elements) return { ok: false, error: new Error('Payment not ready') }
			// Deferred intent: validate first, then create the session against the final total.
			const { error: submitError } = await stripe.elements.submit()
			if (submitError) return { ok: false, error: submitError }
			const clientSecret = await session.ensureClientSecret()
			if (!clientSecret) return { ok: false, error: new Error('Could not start the payment session') }
			const billing = cartBillingDetails(ctx?.cart)
			const { error } = await confirmIdealPayment(stripe.stripe, clientSecret, {
				billingDetails: { name: billing.name || '' } as any,
				returnUrl
			})
			// On success the browser has already redirected to the bank; an error means it did not.
			if (error) return { ok: false, error }
			return { ok: true }
		} catch (e) {
			return { ok: false, error: e }
		}
	}
	onMount(() => ctx?.registerPayment(authorizePayment))
</script>

{#if note}
	<p data-checkout-stripe-ideal class={cn('text-sm text-muted-foreground', className)}>{note}</p>
{/if}
