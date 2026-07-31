<script lang="ts">
	// elements:false CARD payment: split card fields (CardNumber/CardExpiry/CardCvc) + confirmCardPayment
	// (inline, no redirect). Renders only inside <StripeElements>. Registers the place-order payment step.
	import { onMount } from 'svelte'
	import { CardNumber, CardExpiry, CardCvc, getStripeContext, confirmCardPayment } from 'sveltekit-stripe'
	import { cn } from '$lib/utils.js'
	import { getCheckoutContextOptional } from './ctx.svelte.js'
	import { getStripeSessionContext } from './stripe-cs-context.js'
	import { cartBillingDetails } from './checkout-logic.js'

	let { class: className = '' }: { class?: string } = $props()
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
			const { error } = await confirmCardPayment(stripe.stripe, stripe.elements, clientSecret, {
				payment_method: { billing_details: cartBillingDetails(ctx?.cart) as any }
			})
			if (error) return { ok: false, error }
			return { ok: true }
		} catch (e) {
			return { ok: false, error: e }
		}
	}
	onMount(() => ctx?.registerPayment(authorizePayment))

	// Braintree-style bordered container; the Stripe card iframe fills it (themed by buildStripeAppearance).
	const box = 'flex h-9 items-center rounded-md border border-input bg-transparent px-3 shadow-xs [&>div]:w-full'
</script>

<section data-checkout-stripe-card class={cn('grid grid-cols-2 gap-3', className)}>
	<div class="col-span-2">
		<span class="mb-1 block text-sm font-medium">Card number</span>
		<div class={box}><CardNumber /></div>
	</div>
	<div>
		<span class="mb-1 block text-sm font-medium">Expiry</span>
		<div class={box}><CardExpiry /></div>
	</div>
	<div>
		<span class="mb-1 block text-sm font-medium">CVC</span>
		<div class={box}><CardCvc /></div>
	</div>
</section>
