<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutLineContext } from './ctx.svelte.js'
	let { class: className = '', href = '#' }: { class?: string; href?: string } = $props()
	const { item } = getCheckoutLineContext()
</script>

<a {href} data-checkout-title class={cn('min-w-0 text-sm', className)}>
	<div class="font-medium">{item.product_title}</div>
	{#if item.variant_title}<p class="mt-1 text-muted-foreground">{item.variant_title}</p>{/if}
</a>
