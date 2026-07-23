<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCartContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'
	let {
		class: className = '',
		locale = 'en-US',
		label = 'Subtotal'
	}: { class?: string; locale?: string; label?: string } = $props()
	const ctx = getCartContext()
	const currency = $derived(
		(ctx.cart as { currency_code?: string } | null | undefined)?.currency_code ?? 'usd'
	)
	const formatted = $derived(ctx.subtotal == null ? '' : formatPrice(ctx.subtotal, currency, locale))
</script>

{#if formatted}
	<div
		data-cart-item-subtotal
		class={cn('flex items-center justify-between text-base font-medium', className)}
	>
		<span>{label}</span><span>{formatted}</span>
	</div>
{/if}
