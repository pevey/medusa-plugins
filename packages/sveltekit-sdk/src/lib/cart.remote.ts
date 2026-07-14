import { query, command, getRequestEvent } from '$app/server'
import * as v from 'valibot'
import { requestContext } from './internal/request'
import { getConfig } from './internal/state'

export const getCart = query(async () => {
	const ctx = requestContext()
	const { cookies } = getRequestEvent()
	const cartId = cookies.get(getConfig().cookies.cart)
	if (!cartId) return null
	const { cart } = await ctx.client.store.cart.retrieve(cartId, {}, ctx.headers())
	return cart
})

export const addToCart = command(
	v.object({
		variant_id: v.string(),
		quantity: v.optional(v.pipe(v.number(), v.minValue(1)), 1)
	}),
	async ({ variant_id, quantity }) => {
		const ctx = requestContext()
		const { cookies } = getRequestEvent()
		const cfg = getConfig()
		let cartId = cookies.get(cfg.cookies.cart)

		if (!cartId) {
			const { cart } = await ctx.client.store.cart.create(
				ctx.region_id ? { region_id: ctx.region_id } : {},
				{},
				ctx.headers()
			)
			cartId = cart.id
			cookies.set(cfg.cookies.cart, cartId, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 30
			})
		}

		const { cart } = await ctx.client.store.cart.createLineItem(
			cartId,
			{ variant_id, quantity },
			{},
			ctx.headers()
		)
		// Refresh the getCart query in the same round-trip (single-flight mutation).
		await getCart().refresh()
		return cart
	}
)
