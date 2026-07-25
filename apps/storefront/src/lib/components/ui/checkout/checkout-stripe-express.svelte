<script lang="ts">
	// Express Checkout (Apple/Google Pay/Link) for the elements:false CARD path — rendered ABOVE the
	// address as a one-tap express path. REGION-LOCKED: the wallet's shipping countries + rates come from
	// the cart's CURRENT region (Medusa options); the wallet can't swap regions (document in site flow).
	// On tap it collects address + payment, syncs the address to the cart, confirms, and completes.
	// Must render inside <StripeElements>.
	//
	// APPLE PAY: register your domain up front (Stripe Dashboard → Payment methods → Apple Pay → Web
	// domains). Even the Express Checkout Element requires it — it does NOT auto-register (verified live).
	// Availability is reported by the element's `ready` event; we hide the wrapper if no wallet is offered.
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { ExpressCheckout, getStripeContext } from 'sveltekit-stripe'
	import {
		updateCart as sdkUpdateCart,
		completeCart as sdkCompleteCart,
		getRegions as sdkGetRegions,
		getShippingOptions as sdkGetShippingOptions
	} from 'sveltekit-medusa-sdk'
	import { getCheckoutContext } from './ctx.svelte.js'
	import { getStripeClientSecretContext } from './stripe-cs-context.js'
	import { medusaShippingToStripeRates, walletAddressToMedusa, resolveRedirect } from './checkout-logic.js'

	let {
		returnUrl,
		redirectTo = '/',
		updateCart = sdkUpdateCart as any,
		completeCart = sdkCompleteCart as any,
		getRegions = sdkGetRegions as any,
		getShippingOptions = sdkGetShippingOptions as any,
		navigate = goto,
		class: className = ''
	}: {
		returnUrl: string
		redirectTo?: string | ((order: any) => string)
		updateCart?: (data: any) => Promise<any>
		completeCart?: () => Promise<any>
		getRegions?: () => Promise<any[]>
		getShippingOptions?: () => Promise<any[]>
		navigate?: (url: string) => void
		class?: string
	} = $props()

	const ctx = getCheckoutContext()
	const stripe = getStripeContext()
	const cs = getStripeClientSecretContext()

	let ready = $state(false)
	let hideExpress = $state(false) // set in onReady when the element reports no wallet
	let allowedShippingCountries = $state<string[]>([])
	// Apple Pay won't offer itself when shippingAddressRequired but there are NO rates. Medusa returns
	// none until an address is entered, so seed a placeholder; shippingaddresschange swaps in real rates.
	const shippingRates = $derived.by(() => {
		const rates = medusaShippingToStripeRates(ctx.shippingOptions ?? [])
		return rates.length ? rates : [{ id: '__pending_rate', displayName: 'Standard shipping', amount: 0 }]
	})

	onMount(async () => {
		try {
			const regions = await getRegions()
			const region = (regions ?? []).find((r: any) => r.id === ctx.cart?.region_id)
			allowedShippingCountries = (region?.countries ?? []).map((c: any) => String(c.iso_2).toUpperCase())
		} catch {
			// non-fatal — the element still works, just without the region country restriction
		}
		ready = true
	})

	function onReady(e: any) {
		if (!e?.availablePaymentMethods) hideExpress = true
	}
	async function onShippingAddressChange(e: any) {
		try {
			// e.address is a PARTIAL address (country/postal/city/state) — enough for Medusa to price shipping.
			const a = e.address ?? {}
			await updateCart({
				shipping_address: {
					city: a.city || undefined,
					province: a.state || undefined,
					postal_code: a.postal_code || a.postalCode || undefined,
					country_code: a.country ? String(a.country).toLowerCase() : undefined
				}
			})
			const rates = medusaShippingToStripeRates(await getShippingOptions())
			if (rates.length) e.resolve({ shippingRates: rates })
			else e.reject()
		} catch {
			e.reject()
		}
	}
	async function onShippingRateChange(e: any) {
		if (e.shippingRate?.id && e.shippingRate.id !== '__pending_rate') await ctx.selectShipping(e.shippingRate.id)
		e.resolve({}) // Stripe re-reads the amount from the updated PaymentIntent
	}
	async function onConfirm(e: any) {
		try {
			await updateCart(walletAddressToMedusa(e.billingDetails, e.shippingAddress))
			const { error } = await stripe.stripe!.confirmPayment({
				elements: stripe.elements!,
				clientSecret: cs.clientSecret!,
				confirmParams: { return_url: returnUrl },
				redirect: 'if_required'
			})
			if (error) {
				e.paymentFailed?.({ reason: 'fail' })
				return
			}
			const order = await completeCart()
			if (order?.id?.startsWith?.('order_')) {
				const url = resolveRedirect(redirectTo, order)
				if (url) navigate(url)
			}
		} catch {
			e.paymentFailed?.({ reason: 'fail' })
		}
	}
</script>

{#if ready && !hideExpress}
	<div data-checkout-stripe-express class={className}>
		<ExpressCheckout
			expressCheckoutOptions={{
				emailRequired: true,
				shippingAddressRequired: true,
				allowedShippingCountries,
				shippingRates
			} as any}
			{onReady}
			{onConfirm}
			{onShippingAddressChange}
			{onShippingRateChange}
		/>
	</div>
{/if}
