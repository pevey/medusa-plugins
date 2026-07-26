<script lang="ts">
	// Braintree CARD fields (mirrors checkout-stripe-card). Renders INSIDE <HostedFields>
	// (checkout-braintree-hosted-fields). Tokenizes the entered card on the place-order payment step via
	// the sveltekit-braintree context; no direct braintree-web usage.
	import { onMount } from 'svelte'
	import {
		CardNumber,
		ExpirationDate,
		Cvv,
		getBraintreeContext,
		tokenizeCard
	} from 'sveltekit-braintree'
	import { initiateBraintreePaymentSession, formatBraintreeAddress } from 'sveltekit-medusa-sdk'
	import { cn } from '$lib/utils.js'
	import { getCheckoutContextOptional } from './ctx.svelte.js'
	import { resolveInputSurface } from './stripe-appearance.js'

	const PROVIDER = 'pp_braintree_braintree'

	let {
		cardNumberLabel = 'Card Number',
		expirationDateLabel = 'Expiration Date',
		cvvLabel = 'CVV',
		class: className = ''
	}: {
		cardNumberLabel?: string
		expirationDateLabel?: string
		cvvLabel?: string
		class?: string
	} = $props()

	const checkoutCtx = getCheckoutContextOptional()
	const bt = getBraintreeContext()

	// Opaque surface matching the shadcn input lift — the container fill behind the iframe's padding
	// (the iframe itself is filled to the same colour by the provider's box-shadow `styles`).
	let surfaceColor = $state('')

	async function authorizePayment() {
		try {
			if (!bt.hostedFields) return { ok: false, error: new Error('Payment not ready') }
			const { nonce } = await tokenizeCard(bt.hostedFields, {
				vault: true,
				billingAddress: formatBraintreeAddress('billing', checkoutCtx?.cart ?? null)
			})
			const session = await initiateBraintreePaymentSession({
				provider_id: PROVIDER,
				data: { payment_method_nonce: nonce, deviceData: bt.deviceData ?? undefined }
			})
			if (!session) return { ok: false, error: new Error('Payment session failed') }
			return { ok: true }
		} catch (e) {
			return { ok: false, error: e }
		}
	}

	onMount(() => {
		checkoutCtx?.registerPayment(authorizePayment)
		surfaceColor = resolveInputSurface()
	})

	const box = 'h-9 rounded-md border border-input px-3 shadow-xs'
</script>

<section data-checkout-braintree-payment class={cn('grid grid-cols-2 gap-3', className)}>
	<div class="col-span-2">
		<span class="mb-1 block text-sm font-medium">{cardNumberLabel}</span>
		<CardNumber class={box} style="background-color: {surfaceColor}" />
	</div>
	<div>
		<span class="mb-1 block text-sm font-medium">{expirationDateLabel}</span>
		<ExpirationDate class={box} style="background-color: {surfaceColor}" />
	</div>
	<div>
		<span class="mb-1 block text-sm font-medium">{cvvLabel}</span>
		<Cvv class={box} style="background-color: {surfaceColor}" />
	</div>
</section>
