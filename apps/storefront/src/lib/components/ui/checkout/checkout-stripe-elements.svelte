<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Elements } from 'sveltekit-stripe'
	import { initiatePaymentSession } from 'sveltekit-medusa-sdk'
	import { getStripeClientSecret } from './checkout-logic.js'
	import { buildStripeAppearance, resolveInputSurface } from './stripe-appearance.js'
	import { setStripeSessionContext } from './stripe-cs-context.js'
	import { toMinorUnits, canMountElements } from './stripe-session.js'
	import { getCheckoutContextOptional } from './ctx.svelte.js'

	interface Props {
		/** Stripe publishable key (pk_...). */
		publishableKey: string
		/** Medusa Stripe provider id — any `pp_stripe-*` (card, iDEAL, Bancontact, …). */
		providerId?: string
		children: Snippet
	}
	let { publishableKey, providerId = 'pp_stripe_stripe', children }: Props = $props()

	const ctx = getCheckoutContextOptional()

	// <Elements> is created in Stripe's DEFERRED mode — `{mode, amount, currency}` instead of a
	// clientSecret — so it can mount immediately, before any payment session exists. This is what
	// lets the address form and delivery selector (which live INSIDE this boundary) render at all:
	// they are the very UI the shopper needs in order to settle the total.
	//
	// The PaymentIntent is created later, by ensureClientSecret() at place-order time. See
	// stripe-session.ts for why anything created earlier would already be dead.
	const currency = $derived((ctx?.cart?.currency_code ?? '').toLowerCase())
	const amount = $derived(ctx?.cart ? toMinorUnits(ctx.cart.total ?? 0, currency) : null)
	const ready = $derived(canMountElements(amount) && !!currency)

	let stripeElements = $state<any>(null)

	// Keep Stripe's notion of the amount aligned with the cart as shipping/discounts move it.
	// `elements.update()` mutates the existing instance, so nothing remounts and no in-progress
	// card input is lost. An attachment (not $effect) keeps this browser-only and re-runs on change.
	const syncAmount = (next: number | null) => () => {
		if (stripeElements && canMountElements(next)) stripeElements.update({ amount: next })
	}

	async function ensureClientSecret(): Promise<string | null> {
		try {
			const session = await initiatePaymentSession({ provider_id: providerId })
			const secret = getStripeClientSecret(session, providerId) ?? null
			if (import.meta.env.DEV && !secret) {
				console.warn(`[CheckoutStripe] no client_secret from "${providerId}" — is there an active cart whose region has this Stripe provider enabled?`, session)
			}
			return secret
		} catch (e) {
			if (import.meta.env.DEV) console.error(`[CheckoutStripe] initiate "${providerId}" session failed`, e)
			return null
		}
	}

	setStripeSessionContext({ ensureClientSecret })
</script>

{#if ready}
	<div data-checkout-stripe-elements {@attach syncAmount(amount)}>
		<Elements
			bind:elements={stripeElements}
			publicKey={publishableKey}
			elementsOptions={{
				mode: 'payment',
				amount: amount as number,
				currency,
				appearance: buildStripeAppearance({ inputSurface: resolveInputSurface() })
			}}
		>
			{@render children()}
		</Elements>
	</div>
{:else}
	<div data-checkout-stripe-loading class="py-8 text-center text-sm text-muted-foreground">Loading secure payment…</div>
{/if}
