import Stripe from 'stripe'
import { command } from '$app/server'
import { getProductQuery } from 'sveltekit-medusa-sdk'
import { STRIPE_SECRET_KEY } from '$app/env/private'

const stripe = new Stripe(STRIPE_SECRET_KEY)

// Demo for the cta `StripeExpressCheckout` (Stripe DEFERRED mode). The client renders the wallet with a
// display amount, but the actual charge amount is resolved SERVER-SIDE from the Test product's price —
// never mint an intent for a client-supplied amount.
export const createProductIntent = command(async () => {
	const product = await getProductQuery({ slug: 'test' })
	const price = (product as any)?.variants?.[0]?.calculated_price
	const amount = Math.round((Number(price?.calculated_amount) || 0) * 100)
	if (!amount) throw new Error('Test product has no price in the default region')

	const intent = await stripe.paymentIntents.create({
		amount,
		currency: price?.currency_code ?? 'usd',
		automatic_payment_methods: { enabled: true }
	})
	if (!intent.client_secret) throw new Error('Stripe did not return a client secret')
	return { clientSecret: intent.client_secret }
})
