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

/** Which checkout body renders a provider id. The whole Stripe FAMILY (`pp_stripe-*`: card, iDEAL,
 *  Bancontact, …) routes to the Stripe body; Braintree to the Braintree body; anything else = null. */
export type CheckoutProviderKind = 'stripe' | 'braintree'
export function classifyProvider(id: string): CheckoutProviderKind | null {
	if (id.startsWith('pp_stripe')) return 'stripe'
	if (id === 'pp_braintree_braintree') return 'braintree'
	return null
}

/** First available provider this checkout can render, with the body that renders it. */
export function resolveCheckoutProvider(available: string[]): { id: string; kind: CheckoutProviderKind } | null {
	for (const id of available) {
		const kind = classifyProvider(id)
		if (kind) return { id, kind }
	}
	return null
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

/** Which elements:false payment UI a Stripe provider id maps to (null = not yet wired). */
export function resolveStripeMethod(providerId: string): 'card' | 'ideal' | null {
	if (providerId === 'pp_stripe_stripe') return 'card'
	if (providerId === 'pp_stripe-ideal_stripe') return 'ideal'
	return null
}

/** Stripe `billing_details` built from the cart's shipping address (for confirm<Method>Payment). */
export function cartBillingDetails(cart: any): {
	name?: string
	email?: string
	phone?: string
	address?: {
		line1?: string
		line2?: string
		city?: string
		postal_code?: string
		state?: string
		country?: string
	}
} {
	const s = cart?.shipping_address
	if (!cart) return {}
	const name = [s?.first_name, s?.last_name].filter(Boolean).join(' ') || undefined
	return {
		name,
		email: cart?.email || undefined,
		phone: s?.phone || undefined,
		address: s
			? {
					line1: s.address_1 || undefined,
					line2: s.address_2 || undefined,
					city: s.city || undefined,
					postal_code: s.postal_code || undefined,
					state: s.province || undefined,
					country: s.country_code || undefined
				}
			: undefined
	}
}

/** Map Medusa shipping options to the Stripe Express Checkout shipping-rate shape. */
export function medusaShippingToStripeRates(
	options: any[]
): { id: string; displayName: string; amount: number }[] {
	return (options ?? []).map((o) => ({ id: o.id, displayName: o.name, amount: o.amount ?? 0 }))
}

/** Map a wallet's billing/shipping details (Express Checkout) to a Medusa cart-update payload. */
export function walletAddressToMedusa(
	billing: any,
	shipping?: { name?: string; address?: any }
): { email?: string; shipping_address?: any; billing_address?: any } {
	const toAddr = (name?: string, a?: any) => {
		if (!a) return undefined
		const [first_name, ...rest] = String(name ?? '').trim().split(' ')
		return {
			first_name: first_name || undefined,
			last_name: rest.join(' ') || undefined,
			phone: billing?.phone || undefined,
			address_1: a.line1 || undefined,
			address_2: a.line2 || undefined,
			city: a.city || undefined,
			province: a.state || undefined,
			postal_code: a.postal_code || undefined,
			country_code: a.country ? String(a.country).toLowerCase() : undefined
		}
	}
	return {
		email: billing?.email || undefined,
		shipping_address: toAddr(shipping?.name ?? billing?.name, shipping?.address ?? billing?.address),
		billing_address: toAddr(billing?.name, billing?.address)
	}
}
