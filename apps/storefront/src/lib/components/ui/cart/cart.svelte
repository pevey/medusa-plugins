<script lang="ts">
	import { cn } from '$lib/utils.js'
	import {
		getCart as sdkGetCart,
		updateCartItem as sdkUpdateCartItem,
		removeFromCart as sdkRemoveFromCart
	} from 'sveltekit-medusa-sdk'
	import { setCartContext } from './ctx.svelte.js'
	import * as logic from './cart-logic.js'
	import { defaultLineHref } from './cart-logic.js'
	import type { GetCartFn, UpdateCartItemFn, RemoveFromCartFn, LineHrefFn } from './types.js'
	import type { StoreCart } from '@medusajs/types'
	import { untrack } from 'svelte'
	import type { Snippet } from 'svelte'

	interface Props {
		getCart?: GetCartFn
		updateCartItem?: UpdateCartItemFn
		removeFromCart?: RemoveFromCartFn
		onupdate?: (cart: StoreCart) => void
		onremove?: (cart: StoreCart) => void
		onerror?: (err: unknown) => void
		checkoutUrl?: string
		lineHref?: LineHrefFn
		class?: string
		children: Snippet
	}
	let {
		getCart = sdkGetCart as unknown as GetCartFn,
		updateCartItem = sdkUpdateCartItem as unknown as UpdateCartItemFn,
		removeFromCart = sdkRemoveFromCart as unknown as RemoveFromCartFn,
		onupdate,
		onremove,
		onerror,
		checkoutUrl = '/checkout',
		lineHref = defaultLineHref,
		class: className = '',
		children
	}: Props = $props()

	// Call the query once; read `.current`/`.loading`/`.error` reactively (no $effect).
	const q = untrack(() => getCart())
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
</script>

<div class={cn('', className)}>
	{@render children()}
</div>
