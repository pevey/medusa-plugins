<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'

	let { class: className = '', locale = 'en-US' }: { class?: string; locale?: string } = $props()

	const ctx = getCheckoutContext()
	const amount = $derived(ctx.cart?.shipping_total)
	const label = $derived(ctx.cart?.shipping_methods?.[0]?.name ?? 'Shipping')
	const formatted = $derived(formatPrice(amount, ctx.cart?.currency_code ?? 'usd', locale))
</script>

{#if formatted}
	<div data-checkout-summary-shipping class={cn('flex justify-between', className)}>
		<dt>{label}</dt><dd>{formatted}</dd>
	</div>
{/if}
