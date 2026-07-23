<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getProductContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'

	let { class: className = '', locale = 'en-US' }: { class?: string; locale?: string } = $props()
	const ctx = getProductContext()

	const price = $derived(ctx.selectedVariant?.calculated_price)
	// Empty when there's no price (e.g. the SDK omits calculated_price when no pricing region
	// is resolved). Render nothing in that case rather than an empty price line.
	const formatted = $derived(formatPrice(price, locale))
	const onSale = $derived(
		price?.calculated_amount != null &&
			price?.original_amount != null &&
			price.calculated_amount < price.original_amount
	)
</script>

{#if formatted}
	<p class={cn('flex items-baseline gap-2', className)}>
		<span class="text-2xl">{formatted}</span>
		{#if onSale}
			<s data-original class="text-muted-foreground text-sm">
				{formatPrice({ ...price, calculated_amount: price?.original_amount }, locale)}
			</s>
		{/if}
	</p>
{/if}
