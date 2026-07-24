import type { StoreOrder, StoreCart } from '@medusajs/types'
import type { UpdateAddress, AuthorizePayment } from './types'

export type PlaceOrderSteps = {
	updateAddress: UpdateAddress | null
	hasShipping: () => boolean
	authorizePayment: AuthorizePayment | null
	completeCart: () => Promise<StoreOrder | StoreCart | null>
}

function isOrder(result: unknown): result is StoreOrder {
	// The SDK's completeCart unwraps Medusa's `{type:'order',order}` / `{type:'cart',cart}` to the
	// order-or-cart payload. Medusa prefixes ids by entity type, so a completed order is `order_…`
	// and a failed-completion cart is `cart_…` — a reliable discriminant on the unwrapped payload.
	return !!result && typeof (result as { id?: unknown }).id === 'string' && (result as { id: string }).id.startsWith('order_')
}

/** Ordered place-order sequence with guards. Pure: all IO is injected. */
export async function runPlaceOrder(steps: PlaceOrderSteps): Promise<{ order: StoreOrder } | { error: unknown }> {
	try {
		if (steps.updateAddress) await steps.updateAddress()
		if (!steps.hasShipping()) return { error: new Error('No delivery method selected') }
		if (steps.authorizePayment) {
			const r = await steps.authorizePayment()
			if (!r.ok) return { error: r.error ?? new Error('Payment authorization failed') }
		}
		const result = await steps.completeCart()
		if (!result) return { error: new Error('Failed to complete the order') }
		if (!isOrder(result)) return { error: (result as any).errors ?? new Error('Cart could not be completed') }
		return { order: result as StoreOrder }
	} catch (e) {
		return { error: e }
	}
}

/**
 * Pick the payment provider to render: the first of the cart region's `available` provider ids that
 * this checkout `supported`s. Returns undefined when the region offers no supported provider (caller
 * then renders nothing + warns). Structured so a future multi-provider selector is additive.
 */
export function resolveProvider(available: string[], supported: string[]): string | undefined {
	return available.find((id) => supported.includes(id))
}

export function resolveRedirect(
	redirectTo: string | ((order: StoreOrder) => string) | undefined,
	order: StoreOrder
): string | undefined {
	if (!redirectTo) return undefined
	return typeof redirectTo === 'function' ? redirectTo(order) : redirectTo
}

/**
 * Find a provider's payment-session `data` in an initiate-session response. Medusa returns the
 * payment-collection with its sessions; each session's `data` is the raw provider payload (the
 * Braintree client-token blob, or the Stripe PaymentIntent). Falls back to the first session.
 */
function getProviderSessionData(session: any, providerId: string): any | undefined {
	const sessions = session?.payment_collection?.payment_sessions
	if (!Array.isArray(sessions)) return undefined
	const s = sessions.find((ps: any) => ps?.provider_id === providerId) ?? sessions[0]
	return s?.data
}

/** Extract the Braintree client_token from an initiate-session response. */
export function getBraintreeClientToken(session: any, providerId: string): string | undefined {
	return getProviderSessionData(session, providerId)?.client_token
}

/**
 * Extract the Stripe client_secret from an initiate-session response. The Stripe provider stores the
 * full PaymentIntent as the session `data` (verified: `stripe-base.getStatus` → `{ data: intent }`),
 * so the secret lives at `…payment_sessions[].data.client_secret`.
 */
export function getStripeClientSecret(session: any, providerId: string): string | undefined {
	return getProviderSessionData(session, providerId)?.client_secret
}
