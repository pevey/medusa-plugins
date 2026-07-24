<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'

	let { class: className = '', label = 'Subtotal', locale = 'en-US' }: { class?: string; label?: string; locale?: string } = $props()

	const ctx = getCheckoutContext()
	const amount = $derived(ctx.cart?.subtotal)
	const formatted = $derived(formatPrice(amount, ctx.cart?.currency_code ?? 'usd', locale))
</script>

{#if formatted}
	<div data-checkout-summary-subtotal class={cn('flex justify-between', className)}>
		<dt>{label}</dt><dd>{formatted}</dd>
	</div>
{/if}
