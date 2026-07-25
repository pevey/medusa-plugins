import { getContext, setContext } from 'svelte'

// The elements:false payment components (checkout-stripe-card / -ideal) need the clientSecret STRING to
// call confirm<Method>Payment — unlike elements:true's confirmPayment, which infers it from the Elements
// instance. The secret is created in checkout-stripe-elements; it exposes it here via a reactive getter.
const KEY = Symbol('stripe-client-secret')

export interface StripeClientSecretCtx {
	readonly clientSecret: string | null
}

export function setStripeClientSecretContext(ctx: StripeClientSecretCtx): void {
	setContext(KEY, ctx)
}

export function getStripeClientSecretContext(): StripeClientSecretCtx {
	return getContext<StripeClientSecretCtx>(KEY) ?? { clientSecret: null }
}
