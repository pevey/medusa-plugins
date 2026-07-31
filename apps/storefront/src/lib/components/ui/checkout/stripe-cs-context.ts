import { getContext, setContext } from 'svelte'

// Every Stripe payment surface needs a client_secret at confirm time:
//   - Payment Element  → confirmPayment({ elements, clientSecret })
//   - split card       → confirmCardPayment(stripe, elements, clientSecret, …)
//   - iDEAL            → confirmIdealPayment(stripe, clientSecret, …)
//   - Express Checkout → confirmPayment({ elements, clientSecret })
//
// It is deliberately a FUNCTION, not a value. Medusa deletes the cart's payment sessions on
// every total change, so a secret captured at mount is dead by the time the user reaches the
// pay button. `ensureClientSecret()` creates the session on demand — at submit, against the
// final total — mirroring what the Braintree path does with its nonce.
const KEY = Symbol('stripe-session')

export interface StripeSessionCtx {
	/** Initiate a payment session for the CURRENT cart total and return its client_secret. */
	ensureClientSecret: () => Promise<string | null>
}

export function setStripeSessionContext(ctx: StripeSessionCtx): void {
	setContext(KEY, ctx)
}

export function getStripeSessionContext(): StripeSessionCtx {
	return getContext<StripeSessionCtx>(KEY) ?? { ensureClientSecret: async () => null }
}
