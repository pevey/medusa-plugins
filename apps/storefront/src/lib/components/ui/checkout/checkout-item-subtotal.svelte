<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutLineContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'
	let { class: className = '', locale = 'en-US' }: { class?: string; locale?: string } = $props()
	const { item } = getCheckoutLineContext()
	const currencyCode = $derived((item as { currency_code?: string }).currency_code ?? 'usd')
	const amount = $derived(item.subtotal ?? (item.unit_price != null ? item.unit_price * item.quantity : undefined))
	const formatted = $derived(formatPrice(amount, currencyCode, locale))
</script>

{#if formatted}<p data-checkout-item-subtotal class={cn('text-sm font-medium', className)}>{formatted}</p>{/if}
