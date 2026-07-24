import { getContext, setContext } from 'svelte'
import type { CheckoutContext, CheckoutLineContext } from './types.js'

const CHECKOUT = Symbol('checkout')
const CHECKOUT_LINE = Symbol('checkout-line')

export function setCheckoutContext(ctx: CheckoutContext) { setContext(CHECKOUT, ctx) }
export function getCheckoutContext(): CheckoutContext {
	const ctx = getContext<CheckoutContext>(CHECKOUT)
	if (!ctx) throw new Error('Checkout.* must be used within <Checkout.Root>')
	return ctx
}
export function getCheckoutContextOptional(): CheckoutContext | null {
	return getContext<CheckoutContext>(CHECKOUT) ?? null
}
export function setCheckoutLineContext(ctx: CheckoutLineContext) { setContext(CHECKOUT_LINE, ctx) }
export function getCheckoutLineContext(): CheckoutLineContext {
	const ctx = getContext<CheckoutLineContext>(CHECKOUT_LINE)
	if (!ctx) throw new Error('Checkout line parts must be used within <Checkout.Item>')
	return ctx
}
