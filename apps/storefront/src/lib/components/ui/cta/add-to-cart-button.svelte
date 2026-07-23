<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { goto } from '$app/navigation'
	import { Button } from '$lib/components/ui/button/index.js'
	import { getProductContextOptional } from '$lib/components/ui/product/ctx.svelte.js'
	import { isPurchasable } from '$lib/components/ui/product/product-logic.js'
	import { addToCart as sdkAddToCart } from 'sveltekit-medusa-sdk'
	import { resolveVariantId, resolveQuantity } from './add-to-cart-logic.js'
	import type { AddToCartFn } from './types.js'
	import type { StoreCart } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		variantId?: string
		quantity?: number
		disabled?: boolean
		redirectTo?: string
		showMessage?: boolean
		messagePlacement?: 'below' | 'right'
		messageClass?: string
		class?: string
		onadd?: (cart: StoreCart) => void
		onerror?: (err: unknown) => void
		addToCart?: AddToCartFn
		navigate?: (href: string) => Promise<void> | void
		children?: Snippet
		message?: Snippet<[{ status: 'idle' | 'success' | 'error'; cart: StoreCart | null; error: unknown; id: string }]>
	}
	let {
		variantId,
		quantity,
		disabled = false,
		redirectTo,
		showMessage = true,
		messagePlacement = 'below',
		messageClass = '',
		class: className = '',
		onadd,
		onerror,
		addToCart = sdkAddToCart as unknown as AddToCartFn,
		navigate = goto,
		children,
		message
	}: Props = $props()

	const statusId = $props.id()

	const ctx = getProductContextOptional()
	const resolvedVariantId = $derived(resolveVariantId(variantId, ctx))
	const resolvedQuantity = $derived(resolveQuantity(quantity, ctx))
	// Standalone (no ctx) can't inspect stock → treat as purchasable; server + `disabled` prop guard.
	const purchasable = $derived(ctx ? isPurchasable(ctx.selectedVariant) : true)

	let pending = $state(false)
	let status = $state<'idle' | 'success' | 'error'>('idle')
	let resultCart = $state<StoreCart | null>(null)
	let error = $state<unknown>(null)

	const isDisabled = $derived(disabled || pending || !resolvedVariantId || !purchasable)

	async function handleClick() {
		if (isDisabled) return
		status = 'idle'
		error = null
		pending = true
		try {
			const cart = await addToCart({ variant_id: resolvedVariantId!, quantity: resolvedQuantity })
			resultCart = cart
			status = 'success'
			onadd?.(cart)
			if (redirectTo) {
				await navigate(redirectTo) // page leaves — keep `pending` so the button doesn't flash idle
			} else {
				pending = false
			}
		} catch (e) {
			error = e
			status = 'error'
			onerror?.(e)
			pending = false
		}
	}

	// Handle a plain string, an Error, or a SvelteKit HttpError ({ status, body: { message } }) —
	// the SDK surfaces backend cart errors as HttpErrors so a real message reaches us.
	const errorText = $derived.by(() => {
		const e = error as { body?: { message?: string }; message?: string } | string | null
		if (!e) return 'Something went wrong'
		if (typeof e === 'string') return e
		return e.body?.message ?? e.message ?? 'Something went wrong'
	})
	const showStatus = $derived(showMessage && !redirectTo && status !== 'idle')
</script>

<div class={cn('flex', messagePlacement === 'right' ? 'flex-row items-center gap-3' : 'flex-col gap-2')}>
	<Button
		type="button"
		class={className}
		disabled={isDisabled}
		aria-busy={pending}
		aria-describedby={showStatus && !message ? statusId : undefined}
		onclick={handleClick}
	>
		{#if children}{@render children()}{:else}Add to cart{/if}
	</Button>

	{#if message}
		{@render message({ status, cart: resultCart, error, id: statusId })}
	{:else if showStatus}
		{#if status === 'success'}
			<span id={statusId} role="status" data-status="success" class={cn('text-sm text-muted-foreground', messageClass)}>Added to cart</span>
		{:else if status === 'error'}
			<span id={statusId} role="alert" data-status="error" class={cn('text-sm text-destructive', messageClass)}>{errorText}</span>
		{/if}
	{/if}
</div>
