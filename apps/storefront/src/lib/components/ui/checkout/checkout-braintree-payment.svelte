<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	// Static import (not `import('braintree-web')`): a dynamic import of this CJS dep triggers Vite's
	// on-demand dep optimization, whose re-bundle can 404 the in-flight module URL ("Failed to fetch
	// dynamically imported module"). A static import is pre-bundled at startup and avoids that. As a
	// browser-only SDK it can't run under unit tests — this component is intentionally not unit-tested.
	import * as braintree from 'braintree-web'
	import {
		initiateBraintreePaymentSession as sdkInitiate,
		formatBraintreeAddress as sdkFormatBraintreeAddress
	} from 'sveltekit-medusa-sdk'
	import { cn } from '$lib/utils.js'
	import { getCheckoutContextOptional } from './ctx.svelte.js'
	import { getBraintreeClientToken } from './checkout-logic.js'
	import { domCssVarResolver, resolveInputSurface } from './stripe-appearance.js'
	import type { InitiateBraintreeFn } from './types.js'

	const PROVIDER = 'pp_braintree_braintree'

	interface Props {
		initiateBraintreePaymentSession?: InitiateBraintreeFn
		formatBraintreeAddress?: (type: 'billing' | 'shipping', cart: any) => Record<string, string>
		cardNumberLabel?: string
		expirationDateLabel?: string
		cvvLabel?: string
		class?: string
	}
	let {
		initiateBraintreePaymentSession = sdkInitiate as unknown as InitiateBraintreeFn,
		formatBraintreeAddress = sdkFormatBraintreeAddress as unknown as (type: 'billing' | 'shipping', cart: any) => Record<string, string>,
		cardNumberLabel = 'Card Number',
		expirationDateLabel = 'Expiration Date',
		cvvLabel = 'CVV',
		class: className = ''
	}: Props = $props()

	const ctx = getCheckoutContextOptional()

	let hostedFields: any = $state(null)
	let client: any = $state(null)
	// Opaque equivalent of the shadcn input's translucent lift, so the hosted-field iframe (which can't
	// paint a translucent fill) matches the plain inputs beside it. Also backs the container gap/corners.
	let surfaceColor = $state('')

	async function authorizePayment() {
		try {
			if (!hostedFields || !client) return { ok: false, error: new Error('Payment not ready') }
			const [payload, deviceData] = await Promise.all([
				hostedFields.tokenize({ vault: true, billingAddress: formatBraintreeAddress('billing', ctx?.cart ?? null) }),
				braintree.dataCollector.create({ client }).then((d) => d.deviceData)
			])
			const session = await initiateBraintreePaymentSession({
				provider_id: PROVIDER,
				data: { payment_method_nonce: payload.nonce, deviceData }
			})
			if (!session) return { ok: false, error: new Error('Payment session failed') }
			return { ok: true }
		} catch (e) {
			return { ok: false, error: e }
		}
	}

	onMount(async () => {
		// Register immediately so the Root has the step available right away; `authorizePayment`
		// itself guards on `hostedFields`/`client` being ready, so a slow/failed mount never blocks
		// place-order — it just fails the payment step with a clear error.
		ctx?.registerPayment(authorizePayment)

		const session = await initiateBraintreePaymentSession({ provider_id: PROVIDER })
		const authorization = getBraintreeClientToken(session, PROVIDER)
		if (!authorization) return

		client = await braintree.client.create({ authorization })
		// Theme the hosted-field IFRAMES with shadcn tokens. Braintree's `styles` can't read the parent
		// document's CSS custom properties (cross-origin iframe) and only styles TEXT (the field's
		// background comes from our container div), so we resolve CONCRETE values — same approach as the
		// Stripe appearance. Colors are round-tripped to rgb (Braintree, like Stripe, won't take oklch).
		const resolve = domCssVarResolver()
		const fg = resolve('--foreground', true)
		// The iframe input renders with the browser's default (light) form-control background — solid
		// white — and Braintree's `allowedStyles` whitelist has NO `background`/`background-color`/
		// `color-scheme`, so we can't set it directly. The one whitelisted property that CAN paint the
		// field is `box-shadow`: a large OPAQUE inset shadow fills the input, covering the white.
		// (`-webkit-box-shadow` for Safari — the same trick that defeats the yellow autofill background.)
		// We fill with `resolveInputSurface()` — the OPAQUE equivalent of the shadcn input's translucent
		// lift — so the field matches the plain inputs beside it, not the flat page. `-webkit-text-fill-
		// color` keeps text visible over the shadow.
		surfaceColor = resolveInputSurface()
		const fieldStyles = {
			input: {
				'box-shadow': `inset 0 0 0 1000px ${surfaceColor}`,
				'-webkit-box-shadow': `inset 0 0 0 1000px ${surfaceColor}`,
				'font-size': '14px',
				'font-family': resolve('--font-sans', false) || 'inherit',
				color: fg,
				'-webkit-text-fill-color': fg
			},
			'::placeholder': { color: resolve('--muted-foreground', true) },
			'input.invalid': { color: resolve('--destructive', true) }
		}
		hostedFields = await braintree.hostedFields.create({
			client,
			styles: fieldStyles,
			fields: {
				number: { container: '#checkout-card-number' },
				expirationDate: { container: '#checkout-expiration-date' },
				cvv: { container: '#checkout-cvv' }
			}
		})
	})

	onDestroy(() => {
		try {
			hostedFields?.teardown?.()
		} catch {
			// ignore teardown failures on unmount
		}
	})
</script>

<!-- Braintree injects an iframe styled `height:100%` into each container, so every container MUST
     have an explicit height or the field renders invisibly. -->
<section data-checkout-braintree-payment class={cn('grid grid-cols-2 gap-3', className)}>
	<div class="col-span-2">
		<span class="mb-1 block text-sm font-medium">{cardNumberLabel}</span>
		<div id="checkout-card-number" class="h-9 rounded-md border border-input bg-background px-3 shadow-xs" style="background-color: {surfaceColor}"></div>
	</div>
	<div>
		<span class="mb-1 block text-sm font-medium">{expirationDateLabel}</span>
		<div id="checkout-expiration-date" class="h-9 rounded-md border border-input bg-background px-3 shadow-xs" style="background-color: {surfaceColor}"></div>
	</div>
	<div>
		<span class="mb-1 block text-sm font-medium">{cvvLabel}</span>
		<div id="checkout-cvv" class="h-9 rounded-md border border-input bg-background px-3 shadow-xs" style="background-color: {surfaceColor}"></div>
	</div>
</section>
