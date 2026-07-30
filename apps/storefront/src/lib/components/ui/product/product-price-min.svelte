<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getProductContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'

	// The lowest variant price. Scalar and unstyled beyond a class hook so consumers can lay a
	// range out however they like (`From <PriceMin />`, `<PriceMin /> – <PriceMax />`, …).
	let { class: className = '', locale = 'en-US' }: { class?: string; locale?: string } = $props()
	const ctx = getProductContext()
	const formatted = $derived(formatPrice(ctx.priceMin, locale))
</script>

{#if formatted}
	<span data-product-price-min class={cn('', className)}>{formatted}</span>
{/if}
