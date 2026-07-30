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
	import Subtotal from './cart-subtotal.svelte'
	import Checkout from './cart-checkout.svelte'
	import type { StoreCart } from '@medusajs/types'
	import { cn } from '$lib/utils.js'
	import type { LineHrefFn } from './types.js'

	interface Props {
		onupdate?: (cart: StoreCart) => void
		onremove?: (cart: StoreCart) => void
		onerror?: (err: unknown) => void
		checkoutUrl?: string
		lineHref?: LineHrefFn
		triggerClass?: string
		contentClass?: string
	}
	let { onupdate, onremove, onerror, checkoutUrl = '/checkout', lineHref, triggerClass = '', contentClass = '' }: Props = $props()
</script>

<Root {onupdate} {onremove} {onerror} {checkoutUrl} {lineHref}>
	<Sheet.Root>
		<Trigger class={triggerClass} />
		<Sheet.Content side="right" class={cn('w-full! gap-0 overflow-y-auto p-6 sm:w-4/5! sm:max-w-none! md:w-2/3! lg:w-2/3! xl:w-1/2!', contentClass)}>
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
				<Subtotal class="px-2" />
				<p class="mt-1 px-2 text-sm text-muted-foreground">Shipping and taxes calculated at checkout.</p>
				<div class="mt-4 px-2">
					<Checkout />
				</div>
			</div>
		</Sheet.Content>
	</Sheet.Root>
</Root>
