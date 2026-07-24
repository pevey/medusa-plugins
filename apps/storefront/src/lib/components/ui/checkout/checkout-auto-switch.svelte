<script lang="ts">
	// Renders the checkout body for the cart region's payment provider. Must sit inside <Checkout.Root>
	// (reads `availableProviders` off its context). Structured so a multi-provider selector is additive.
	import type { RemoteForm } from '@sveltejs/kit'
	import { getCheckoutContext } from './ctx.svelte.js'
	import { resolveProvider } from './checkout-logic.js'
	import BraintreeBody from './checkout-braintree-body.svelte'
	import StripeBody from './checkout-stripe-body.svelte'
	import type { InitiatePaymentSessionFn } from './types.js'

	const BRAINTREE = 'pp_braintree_braintree'
	const STRIPE = 'pp_stripe_stripe'
	const SUPPORTED = [BRAINTREE, STRIPE]

	type ProviderConfig = { elements?: boolean }

	let {
		form,
		config,
		googlePlacesApiKey,
		publishableKey,
		returnUrl,
		restrictToCurrentRegion,
		initiatePaymentSession
	}: {
		form: RemoteForm<any, any>
		/** Per-provider config, keyed by the full Medusa provider id (e.g. { pp_stripe_stripe: { elements: true } }). */
		config?: Record<string, ProviderConfig | undefined>
		googlePlacesApiKey?: string
		publishableKey?: string
		returnUrl?: string
		restrictToCurrentRegion?: boolean
		initiatePaymentSession?: InitiatePaymentSessionFn
	} = $props()

	const ctx = getCheckoutContext()
	const active = $derived(resolveProvider(ctx.availableProviders, SUPPORTED))
	// The region offers a provider, but none this checkout supports → render nothing (dev logs which).
	const unsupported = $derived(!active && ctx.availableProviders.length > 0 ? ctx.availableProviders[0] : null)
</script>

{#if active === BRAINTREE}
	<BraintreeBody {form} {googlePlacesApiKey} {restrictToCurrentRegion} />
{:else if active === STRIPE}
	{@const elements = config?.[STRIPE]?.elements ?? true}
	{@const _warn =
		import.meta.env.DEV &&
		elements === false &&
		console.warn('[CheckoutAuto] pp_stripe_stripe config elements:false (split-card) is not built yet — using Elements')}
	<StripeBody
		{form}
		publishableKey={publishableKey ?? ''}
		returnUrl={returnUrl ?? ''}
		{restrictToCurrentRegion}
		{initiatePaymentSession}
	/>
{:else if unsupported}
	{@const _err =
		import.meta.env.DEV &&
		console.error(`[CheckoutAuto] payment provider "${unsupported}" is not yet supported`)}
{/if}
