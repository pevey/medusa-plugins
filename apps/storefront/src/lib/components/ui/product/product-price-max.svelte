<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getProductContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'

	// The highest variant price. See PriceMin.
	let { class: className = '', locale = 'en-US' }: { class?: string; locale?: string } = $props()
	const ctx = getProductContext()
	const formatted = $derived(formatPrice(ctx.priceMax, locale))
</script>

{#if formatted}
	<span data-product-price-max class={cn('', className)}>{formatted}</span>
{/if}
