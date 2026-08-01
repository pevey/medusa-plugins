import { getContext, setContext } from 'svelte'
import type { StoreCart } from '@medusajs/types'
import type { CartLine } from './types.js'

export type CartContext = {
	readonly cart: StoreCart | null | undefined
	readonly loading: boolean
	readonly error: unknown
	readonly count: number
	readonly lineCount: number
	readonly subtotal: number | undefined
	readonly pending: boolean
	readonly checkoutUrl: string
	lineHref: (item: CartLine) => string
	updateItem: (itemId: string, quantity: number) => Promise<void>
	removeItem: (itemId: string) => Promise<void>
}
export type CartLineContext = { readonly item: CartLine }

export type CartSheetContext = {
	closeOnClick: (node: HTMLElement) => () => void
}

const CART = Symbol('cart')
const LINE = Symbol('cart-line')
const SHEET = Symbol('cart-sheet')

export function setCartContext(ctx: CartContext) {
	setContext(CART, ctx)
}

export function getCartContext(): CartContext {
	const ctx = getContext<CartContext>(CART)
	if (!ctx) throw new Error('Cart.* must be used within <Cart.Root>')
	return ctx
}

export function getCartContextOptional(): CartContext | null {
	return getContext<CartContext>(CART) ?? null
}

export function setCartSheetContext(ctx: CartSheetContext) {
	setContext(SHEET, ctx)
}

// Absent when the cart parts render outside <Cart.Sheet> (an inline /cart page), which is why
// callers spread it as a falsy attachment rather than branching.
export function getCartSheetContextOptional(): CartSheetContext | null {
	return getContext<CartSheetContext>(SHEET) ?? null
}

export function setCartLineContext(ctx: CartLineContext) {
	setContext(LINE, ctx)
}

export function getCartLineContext(): CartLineContext {
	const ctx = getContext<CartLineContext>(LINE)
	if (!ctx) throw new Error('Cart line parts must be used within <Cart.Item>')
	return ctx
}
