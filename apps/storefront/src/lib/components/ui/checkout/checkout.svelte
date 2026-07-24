<script lang="ts">
	import { untrack, type Snippet } from 'svelte'
	import { goto } from '$app/navigation'
	import type { RemoteForm } from '@sveltejs/kit'
	import type { StoreCart, StoreOrder } from '@medusajs/types'
	import {
		getCart as sdkGetCart, updateCartItem as sdkUpdateCartItem, removeFromCart as sdkRemoveFromCart,
		getShippingOptions as sdkGetShippingOptions, selectShippingOption as sdkSelectShippingOption,
		addPromotion as sdkAddPromotion, removePromotion as sdkRemovePromotion, completeCart as sdkCompleteCart
	} from 'sveltekit-medusa-sdk'
	import { cn } from '$lib/utils.js'
	import { setCheckoutContext } from './ctx.svelte.js'
	import { setAddressHost } from '../address/ctx.svelte.js'
	import { runPlaceOrder, resolveRedirect } from './checkout-logic.js'
	import type {
		UpdateAddress, AuthorizePayment, GetCartFn, UpdateCartItemFn, RemoveFromCartFn,
		GetShippingOptionsFn, SelectShippingOptionFn, AddPromotionFn, RemovePromotionFn, CompleteCartFn
	} from './types.js'

	interface Props {
		form: RemoteForm<any, any>
		getCart?: GetCartFn
		updateCartItem?: UpdateCartItemFn
		removeFromCart?: RemoveFromCartFn
		getShippingOptions?: GetShippingOptionsFn
		selectShippingOption?: SelectShippingOptionFn
		addPromotion?: AddPromotionFn
		removePromotion?: RemovePromotionFn
		completeCart?: CompleteCartFn
		navigate?: (url: string) => void | Promise<void>
		redirectTo?: string | ((order: StoreOrder) => string)
		oncomplete?: (order: StoreOrder) => void
		onerror?: (err: unknown) => void
		class?: string
		children: Snippet
	}
	let {
		form,
		getCart = sdkGetCart as unknown as GetCartFn,
		updateCartItem = sdkUpdateCartItem as unknown as UpdateCartItemFn,
		removeFromCart = sdkRemoveFromCart as unknown as RemoveFromCartFn,
		getShippingOptions = sdkGetShippingOptions as unknown as GetShippingOptionsFn,
		selectShippingOption = sdkSelectShippingOption as unknown as SelectShippingOptionFn,
		addPromotion = sdkAddPromotion as unknown as AddPromotionFn,
		removePromotion = sdkRemovePromotion as unknown as RemovePromotionFn,
		completeCart = sdkCompleteCart as unknown as CompleteCartFn,
		navigate = goto,
		redirectTo,
		oncomplete,
		onerror,
		class: className = '',
		children
	}: Props = $props()

	const cartQuery = untrack(() => getCart())
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
		try { await selectShippingOption(optionId) } catch (e) { onerror?.(e) }
	}
	async function applyDiscount(code: string) {
		try { await addPromotion(code) } catch (e) { onerror?.(e) }
	}
	async function removeDiscount(code: string) {
		try { await removePromotion(code) } catch (e) { onerror?.(e) }
	}
	async function updateItem(itemId: string, quantity: number) {
		try { await updateCartItem({ item_id: itemId, quantity }) } catch (e) { onerror?.(e) }
	}
	async function removeItem(itemId: string) {
		try { await removeFromCart(itemId) } catch (e) { onerror?.(e) }
	}

	setCheckoutContext({
		get form() { return form },
		get cart() { return cartQuery.current },
		get placing() { return placing },
		get error() { return error },
		get order() { return order },
		get shippingOptions() { return [] }, // Delivery fetches its own; kept for parts that want it
		registerAddress,
		registerPayment: (fn) => { paymentStep = fn },
		registerShippingRefresh: (fn) => { shippingRefresh = fn },
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
		onAddressChange: () => { shippingRefresh?.() }
	})
</script>

<div class={cn('', className)}>{@render children()}</div>
