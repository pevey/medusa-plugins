<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js'
	import Root from './cart.svelte'
	import Trigger from './cart-trigger.svelte'
	import Items from './cart-items.svelte'
	import Image from './cart-image.svelte'
	import Title from './cart-title.svelte'
	import Price from './cart-price.svelte'
	import Quantity from './cart-quantity.svelte'
	import Remove from './cart-remove.svelte'
	import ItemSubtotal from './cart-item-subtotal.svelte'
	import Checkout from './cart-checkout.svelte'
	import type { GetCartFn, UpdateCartItemFn, RemoveFromCartFn, LineHrefFn } from './types.js'
	import type { StoreCart } from '@medusajs/types'

	interface Props {
		getCart?: GetCartFn
		updateCartItem?: UpdateCartItemFn
		removeFromCart?: RemoveFromCartFn
		onupdate?: (cart: StoreCart) => void
		onremove?: (cart: StoreCart) => void
		onerror?: (err: unknown) => void
		checkoutUrl?: string
		lineHref?: LineHrefFn
		triggerClass?: string
		contentClass?: string
	}
	let {
		getCart, updateCartItem, removeFromCart, onupdate, onremove, onerror,
		checkoutUrl = '/checkout', lineHref, triggerClass = '', contentClass = ''
	}: Props = $props()
</script>

<Root {getCart} {updateCartItem} {removeFromCart} {onupdate} {onremove} {onerror} {checkoutUrl} {lineHref}>
	<Sheet.Root>
		<Trigger class={triggerClass} />
		<Sheet.Content side="right" class={`flex w-full flex-col gap-0 overflow-y-auto p-6 sm:max-w-lg ${contentClass}`}>
			<Sheet.Header>
				<Sheet.Title class="text-center text-2xl font-semibold">Cart</Sheet.Title>
				<Sheet.Description class="sr-only">Your shopping cart</Sheet.Description>
			</Sheet.Header>

			<Items class="border-t">
				<div class="flex flex-1 gap-4">
					<Image />
					<div class="flex min-w-0 flex-1 flex-col">
						<div class="flex justify-between gap-2">
							<Title />
							<Price />
						</div>
						<div class="mt-4 flex items-end justify-between">
							<Quantity />
							<Remove />
						</div>
					</div>
				</div>
			</Items>

			<div class="sticky bottom-0 mt-auto border-t bg-popover py-4">
				<ItemSubtotal class="px-2" />
				<p class="mt-1 px-2 text-sm text-muted-foreground">Shipping and taxes calculated at checkout.</p>
				<div class="mt-4 px-2">
					<Checkout />
				</div>
			</div>
		</Sheet.Content>
	</Sheet.Root>
</Root>
