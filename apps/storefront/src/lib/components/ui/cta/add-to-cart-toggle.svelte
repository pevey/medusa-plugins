<script lang="ts">
	// Reads the cart asynchronously (`experimental.async`, `$derived(await getCart())`).
	// This component wraps its own render in a `<svelte:boundary>` so it suspends on its own
	// while the cart loads — consumers do not need to provide an external boundary.
	import { cn } from '$lib/utils.js'
	import { getProductContextOptional } from '$lib/components/ui/product/ctx.svelte.js'
	import {
		addToCart as sdkAddToCart,
		removeFromCart as sdkRemoveFromCart,
		getCart as sdkGetCart
	} from 'sveltekit-medusa-sdk'
	import { resolveVariantId, findCartLine, cartSatisfiesCondition } from './add-to-cart-logic.js'
	import type { AddToCartFn, RemoveFromCartFn, GetCartFn, CartCondition } from './types.js'
	import type { StoreCart } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		variantId?: string
		quantity?: number
		condition?: CartCondition
		class?: string
		onadd?: (cart: StoreCart) => void
		onremove?: (cart: StoreCart) => void
		addToCart?: AddToCartFn
		removeFromCart?: RemoveFromCartFn
		getCart?: GetCartFn
		children?: Snippet<[{ on: boolean; pending: boolean; disabled: boolean; toggle: () => void }]>
	}
	let {
		variantId,
		quantity = 1,
		condition,
		class: className = '',
		onadd,
		onremove,
		addToCart = sdkAddToCart as unknown as AddToCartFn,
		removeFromCart = sdkRemoveFromCart as unknown as RemoveFromCartFn,
		getCart = sdkGetCart as unknown as GetCartFn,
		children
	}: Props = $props()

	const ctx = getProductContextOptional()
	let pending = $state(false)

	// Reactive cart via the injected query (SvelteKit single-flights it across instances).
	const cart = $derived(await getCart())
	const resolvedVariantId = $derived(resolveVariantId(variantId, ctx))
	const line = $derived(findCartLine(cart, resolvedVariantId))
	const on = $derived(!!line)
	const show = $derived(!condition || cartSatisfiesCondition(cart, condition))
	const disabled = $derived(pending || !resolvedVariantId)

	async function toggle() {
		if (disabled) return
		pending = true
		try {
			if (line) {
				const c = await removeFromCart(line.id)
				if (c) onremove?.(c)
			} else {
				const c = await addToCart({ variant_id: resolvedVariantId!, quantity })
				onadd?.(c)
			}
		} finally {
			pending = false
		}
	}
</script>

<svelte:boundary>
	{#if show}
		{#if children}
			{@render children({ on, pending, disabled, toggle })}
		{:else}
			<label class={cn('flex items-center gap-2', className)}>
				<input
					type="checkbox"
					class="size-4 rounded-sm border-input accent-primary disabled:opacity-50"
					checked={on}
					{disabled}
					onchange={toggle}
				/>
				<span class="text-sm">{on ? 'Added' : 'Add to cart'}</span>
			</label>
		{/if}
	{/if}
	{#snippet pending()}{/snippet}
</svelte:boundary>
