<script lang="ts">
	// Reads the cart asynchronously (`experimental.async`, `$derived(await getCart())`) and wraps its
	// own render in a `<svelte:boundary>`, so it suspends on its own while the cart loads — consumers
	// don't need an external boundary. Awaiting a query stays reactive (re-runs on refresh), and
	// resolves straight to `StoreCart | null`.
	import { cn } from '$lib/utils.js'
	import { getProductContextOptional } from '$lib/components/ui/product/ctx.svelte.js'
	import { addToCart, removeFromCart, getCart } from 'sveltekit-medusa-sdk'
	import { resolveVariantId, findCartLine, cartSatisfiesCondition } from './add-to-cart-logic.js'
	import type { CartCondition } from './types.js'
	import type { StoreCart } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		variantId?: string
		quantity?: number
		condition?: CartCondition
		class?: string
		onadd?: (cart: StoreCart) => void
		onremove?: (cart: StoreCart) => void
		children?: Snippet<[{ on: boolean; pending: boolean; disabled: boolean; toggle: () => void }]>
	}
	let {
		variantId,
		quantity = 1,
		condition,
		class: className = '',
		onadd,
		onremove,
		children
	}: Props = $props()

	const ctx = getProductContextOptional()
	let pending = $state(false)

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
