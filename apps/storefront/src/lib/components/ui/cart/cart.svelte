<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCart, updateCartItem, removeFromCart } from 'sveltekit-medusa-sdk'
	import { setCartContext } from './ctx.svelte.js'
	import * as logic from './cart-logic.js'
	import { defaultLineHref } from './cart-logic.js'
	import type { CartQuery, CartLine, LineHrefFn } from './types.js'
	import type { StoreCart } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		onupdate?: (cart: StoreCart) => void
		onremove?: (cart: StoreCart) => void
		onerror?: (err: unknown) => void
		checkoutUrl?: string
		lineHref?: LineHrefFn
		class?: string
		/**
		 * Either compose the `Cart.*` parts (they read the cart off context), or take the cart
		 * straight off the snippet argument and render it however you like:
		 *   `{#snippet children({ cart, count })}…{/snippet}`
		 */
		children: Snippet<
			[
				{
					cart: StoreCart | null | undefined
					items: CartLine[]
					count: number
					lineCount: number
					subtotal: number | undefined
					loading: boolean
					error: unknown
					pending: boolean
				}
			]
		>
	}
	let { onupdate, onremove, onerror, checkoutUrl = '/checkout', lineHref = defaultLineHref, class: className = '', children }: Props = $props()

	// Keep the live query object (not awaited) so the parts can render inline loading / empty / error
	// states from `.current`/`.loading`/`.error`. The cast restores those members, which this package's
	// svelte-check drops from the SDK's remote-query type (runtime is fine).
	const q = getCart() as unknown as CartQuery
	let pending = $state(false)

	async function updateItem(itemId: string, quantity: number) {
		if (pending) return
		pending = true
		try {
			const cart = await updateCartItem({ item_id: itemId, quantity })
			if (cart) onupdate?.(cart)
		} catch (e) {
			onerror?.(e)
		} finally {
			pending = false
		}
	}
	async function removeItem(itemId: string) {
		if (pending) return
		pending = true
		try {
			const cart = await removeFromCart(itemId)
			if (cart) onremove?.(cart)
		} catch (e) {
			onerror?.(e)
		} finally {
			pending = false
		}
	}

	setCartContext({
		get cart() {
			return q.current
		},
		get loading() {
			return q.loading ?? false
		},
		get error() {
			return q.error
		},
		get count() {
			return logic.totalQuantity(q.current)
		},
		get lineCount() {
			return logic.lineCount(q.current)
		},
		get subtotal() {
			return logic.subtotal(q.current)
		},
		get pending() {
			return pending
		},
		get checkoutUrl() {
			return checkoutUrl
		},
		get lineHref() {
			return lineHref
		},
		updateItem,
		removeItem
	})

	const payload = $derived({
		cart: q.current,
		items: (q.current?.items ?? []) as CartLine[],
		count: logic.totalQuantity(q.current),
		lineCount: logic.lineCount(q.current),
		subtotal: logic.subtotal(q.current),
		loading: q.loading ?? false,
		error: q.error,
		pending
	})
</script>

<div data-cart class={cn('', className)}>
	{@render children(payload)}
</div>
