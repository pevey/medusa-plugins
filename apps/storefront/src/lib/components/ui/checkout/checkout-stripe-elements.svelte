<script lang="ts">
	import { onMount, type Snippet } from 'svelte'
	import { Elements } from 'sveltekit-stripe'
	import { initiatePaymentSession as sdkInitiate } from 'sveltekit-medusa-sdk'
	import { getStripeClientSecret } from './checkout-logic.js'
	import { buildStripeAppearance } from './stripe-appearance.js'
	import type { InitiatePaymentSessionFn } from './types.js'

	const PROVIDER = 'pp_stripe_stripe'

	interface Props {
		/** Stripe publishable key (pk_...). */
		publishableKey: string
		initiatePaymentSession?: InitiatePaymentSessionFn
		children: Snippet
	}
	let {
		publishableKey,
		initiatePaymentSession = sdkInitiate as unknown as InitiatePaymentSessionFn,
		children
	}: Props = $props()

	// The Stripe <Elements> provider must be created WITH the PaymentIntent client_secret, so we
	// initiate the Medusa payment session first, then mount <Elements> around the address + payment
	// surfaces. (Amount stays Medusa's — it manages/updates the intent server-side; see the spec.)
	let clientSecret = $state<string | null>(null)

	onMount(async () => {
		try {
			const session = await initiatePaymentSession({ provider_id: PROVIDER })
			clientSecret = getStripeClientSecret(session, PROVIDER) ?? null
			// Surface the common misconfig instead of sitting silently on the loading state: no
			// client_secret means there's no active cart, or its region isn't configured for Stripe.
			if (import.meta.env.DEV && !clientSecret) {
				console.warn(
					`[CheckoutStripe] no client_secret from "${PROVIDER}" — is there an active cart whose region has Stripe enabled?`,
					session
				)
			}
		} catch (e) {
			clientSecret = null
			if (import.meta.env.DEV) console.error(`[CheckoutStripe] initiate "${PROVIDER}" session failed`, e)
		}
	})
</script>

{#if clientSecret}
	<Elements
		publicKey={publishableKey}
		elementsOptions={{ clientSecret, appearance: buildStripeAppearance() }}
	>
		{@render children()}
	</Elements>
{:else}
	<div data-checkout-stripe-loading class="text-muted-foreground py-8 text-center text-sm">
		Loading secure payment…
	</div>
{/if}
