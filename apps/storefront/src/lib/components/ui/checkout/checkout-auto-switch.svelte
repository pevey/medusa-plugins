<script lang="ts">
	// Renders the checkout body for the cart region's payment provider. Must sit inside <Checkout.Root>
	// (reads `availableProviders` off its context). Structured so a multi-provider selector is additive.
	import type { RemoteForm } from '@sveltejs/kit'
	import { getCheckoutContext } from './ctx.svelte.js'
	import { resolveCheckoutProvider } from './checkout-logic.js'
	import BraintreeBody from './checkout-braintree-body.svelte'
	import StripeBody from './checkout-stripe-body.svelte'
	import type { InitiatePaymentSessionFn } from './types.js'

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
	const resolved = $derived(resolveCheckoutProvider(ctx.availableProviders))
	// The region offers a provider, but none this checkout supports → render nothing (dev logs which).
	const unsupported = $derived(!resolved && ctx.availableProviders.length > 0 ? ctx.availableProviders[0] : null)
</script>

{#if resolved?.kind === 'braintree'}
	<BraintreeBody {form} {googlePlacesApiKey} {restrictToCurrentRegion} />
{:else if resolved?.kind === 'stripe'}
	{@const elements = config?.[resolved.id]?.elements ?? true}
	{@const _warn =
		import.meta.env.DEV &&
		resolved.id === 'pp_stripe_stripe' &&
		elements === false &&
		console.warn('[CheckoutAuto] pp_stripe_stripe config elements:false (split-card) is not built yet — using Elements')}
	<StripeBody
		{form}
		providerId={resolved.id}
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
