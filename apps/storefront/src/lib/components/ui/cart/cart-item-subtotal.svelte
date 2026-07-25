<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCartLineContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'
	let { class: className = '', locale = 'en-US' }: { class?: string; locale?: string } = $props()
	const { item } = getCartLineContext()
	const currencyCode = $derived((item as { currency_code?: string }).currency_code ?? 'usd')
	// Medusa's computed line subtotal (accounts for item-level adjustments); falls back to
	// unit_price × quantity when the cart wasn't fetched with computed totals.
	const amount = $derived(item.subtotal ?? (item.unit_price != null ? item.unit_price * item.quantity : undefined))
	const formatted = $derived(formatPrice(amount, currencyCode, locale))
</script>

{#if formatted}<p data-cart-item-subtotal class={cn('text-sm font-medium', className)}>{formatted}</p>{/if}
