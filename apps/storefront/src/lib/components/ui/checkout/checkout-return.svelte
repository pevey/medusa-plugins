<script lang="ts">
	// Redirect-return handler for redirect-based Stripe methods (iDEAL, Bancontact, giropay, Przelewy24).
	// Drop this on the route your `returnUrl` points at. On return, Stripe has appended the PaymentIntent
	// to the URL; we read its status and, if the payment authorized, complete the Medusa cart to create
	// the order. Standalone (NOT inside Checkout.Root) — it owns its own completeCart + navigation.
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import type { StoreOrder } from '@medusajs/types'
	import { loadStripe } from '@stripe/stripe-js'
	import { getRedirectResult } from 'sveltekit-stripe'
	import { completeCart } from 'sveltekit-medusa-sdk'
	import { cn } from '$lib/utils.js'
	import { resolveRedirect } from './checkout-logic.js'

	interface Props {
		/** Stripe publishable key (pk_...). */
		publishableKey: string
		navigate?: (url: string) => void | Promise<void>
		/** Where to send the shopper once the order is created (string or `(order) => url`). */
		redirectTo?: string | ((order: StoreOrder) => string)
		oncomplete?: (order: StoreOrder) => void
		onerror?: (err: unknown) => void
		class?: string
	}
	let { publishableKey, navigate = goto, redirectTo, oncomplete, onerror, class: className = '' }: Props = $props()

	type Phase = 'checking' | 'success' | 'processing' | 'failed'
	let phase = $state<Phase>('checking')
	let message = $state('')

	onMount(async () => {
		try {
			const stripe = await loadStripe(publishableKey)
			const { status } = await getRedirectResult(stripe)
			if (status === 'succeeded') {
				// Payment authorized — complete the Medusa cart (the cart cookie survives the same-origin
				// redirect round-trip). Medusa prefixes order ids with `order_`.
				const result = await completeCart()
				if (result && String((result as { id?: unknown }).id ?? '').startsWith('order_')) {
					const order = result as StoreOrder
					oncomplete?.(order)
					const url = resolveRedirect(redirectTo, order)
					if (url) await navigate(url)
					else phase = 'success'
				} else {
					phase = 'failed'
					message = 'Payment authorized but the order could not be completed.'
				}
			} else if (status === 'processing') {
				// Async methods (some banks) settle later; the webhook finalizes the order.
				phase = 'processing'
			} else if (status === 'idle') {
				// No redirect params — nothing to resume (e.g. opened directly).
				phase = 'checking'
			} else {
				phase = 'failed'
				message = 'Your payment was not completed.'
			}
		} catch (e) {
			phase = 'failed'
			onerror?.(e)
		}
	})
</script>

<div data-checkout-return class={cn('mx-auto max-w-lg p-8 text-center', className)}>
	{#if phase === 'checking'}
		<p class="text-muted-foreground">Confirming your payment…</p>
	{:else if phase === 'success'}
		<p class="text-lg font-medium">Payment complete.</p>
	{:else if phase === 'processing'}
		<p>Your payment is processing — we'll confirm your order by email shortly.</p>
	{:else}
		<p class="text-destructive">{message || 'Payment failed. Please try again.'}</p>
	{/if}
</div>
