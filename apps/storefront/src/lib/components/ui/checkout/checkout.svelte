<script lang="ts">
	import type { Snippet } from 'svelte'
	import { goto } from '$app/navigation'
	import type { RemoteForm } from '@sveltejs/kit'
	import type { StoreCart, StoreOrder } from '@medusajs/types'
	import {
		getCart,
		updateCartItem,
		removeFromCart,
		getShippingOptions,
		selectShippingOption,
		addPromotion,
		removePromotion,
		completeCart
	} from 'sveltekit-medusa-sdk'
	import { cn } from '$lib/utils.js'
	import { setCheckoutContext } from './ctx.svelte.js'
	import { setAddressHost } from '../address/ctx.svelte.js'
	import { runPlaceOrder, resolveRedirect } from './checkout-logic.js'
	import type { UpdateAddress, AuthorizePayment, CartQuery } from './types.js'

	interface Props {
		form: RemoteForm<any, any>
		navigate?: (url: string) => void | Promise<void>
		redirectTo?: string | ((order: StoreOrder) => string)
		oncomplete?: (order: StoreOrder) => void
		onerror?: (err: unknown) => void
		class?: string
		children: Snippet
	}
	let {
		form,
		navigate = goto,
		redirectTo,
		oncomplete,
		onerror,
		class: className = '',
		children
	}: Props = $props()

	// Keep the live query object (not awaited) so downstream reads (`cartQuery.current`,
	// `cartQuery.current?.region`, etc.) stay reactive. The cast restores those members, which this
	// package's svelte-check drops from the SDK's remote-query type (runtime is fine).
	const cartQuery = getCart() as unknown as CartQuery
	// Payment providers for the cart's CURRENT region (rides the cart — reactive across region switches,
	// unlike the cookie-scoped listPaymentProviders). Needs getCart to expand region.payment_providers.id.
	const availableProviders = $derived(
		((cartQuery.current?.region?.payment_providers ?? []) as { id: string }[]).map(p => p.id)
	)
	let placing = $state(false)
	let error = $state<unknown>(null)
	let order = $state<StoreOrder | null>(null)
	let addressStep: UpdateAddress | null = null
	let paymentStep: AuthorizePayment | null = null
	let shippingRefresh: (() => void | Promise<void>) | null = null

	function hasShipping() {
		return (cartQuery.current?.shipping_methods?.length ?? 0) > 0
	}
	function registerAddress(fn: UpdateAddress) {
		addressStep = fn
	}
	// Surface an error (e.g. an address/region-switch cart update that failed) in the checkout error
	// banner instead of letting it be swallowed.
	function reportError(e: unknown) {
		error = e
		onerror?.(e)
	}

	async function placeOrder() {
		if (placing) return
		placing = true
		error = null
		const result = await runPlaceOrder({
			updateAddress: addressStep,
			hasShipping,
			authorizePayment: paymentStep,
			completeCart: () => completeCart()
		})
		if ('order' in result) {
			oncomplete?.(result.order)
			const url = resolveRedirect(redirectTo, result.order)
			if (url) {
				// Redirecting → do NOT set `order` (that would render <Confirmation> in place while the
				// target route's load runs). The consumer's page is the confirmation UI on this path.
				await navigate(url)
			} else {
				order = result.order
			}
		} else {
			error = result.error
			onerror?.(result.error)
		}
		placing = false
	}

	async function selectShipping(optionId: string) {
		try {
			await selectShippingOption(optionId)
		} catch (e) {
			onerror?.(e)
		}
	}
	async function applyDiscount(code: string) {
		try {
			await addPromotion(code)
		} catch (e) {
			onerror?.(e)
		}
	}
	async function removeDiscount(code: string) {
		try {
			await removePromotion(code)
		} catch (e) {
			onerror?.(e)
		}
	}
	async function updateItem(itemId: string, quantity: number) {
		try {
			await updateCartItem({ item_id: itemId, quantity })
		} catch (e) {
			onerror?.(e)
		}
	}
	async function removeItem(itemId: string) {
		try {
			await removeFromCart(itemId)
		} catch (e) {
			onerror?.(e)
		}
	}

	setCheckoutContext({
		get form() {
			return form
		},
		get cart() {
			return cartQuery.current
		},
		get placing() {
			return placing
		},
		get error() {
			return error
		},
		get order() {
			return order
		},
		get shippingOptions() {
			return []
		}, // Delivery fetches its own; kept for parts that want it
		get availableProviders() {
			return availableProviders
		},
		hasProvider: (id: string) => availableProviders.includes(id),
		registerAddress,
		registerPayment: fn => {
			paymentStep = fn
		},
		registerShippingRefresh: fn => {
			shippingRefresh = fn
		},
		placeOrder,
		selectShipping,
		applyDiscount,
		removeDiscount,
		updateItem,
		removeItem
	})
	// Fill the address-owned host seam: register the address commit step, and re-fetch shipping
	// options whenever the address/region changes (options depend on the shipping address).
	setAddressHost({
		registerUpdateAddress: registerAddress,
		onAddressChange: () => {
			shippingRefresh?.()
		},
		onError: reportError
	})
</script>

<div class={cn('', className)}>{@render children()}</div>
