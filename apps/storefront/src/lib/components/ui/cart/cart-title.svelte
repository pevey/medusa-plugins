<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCartContext, getCartLineContext, getCartSheetContextOptional } from './ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getCartContext()
	const { item } = getCartLineContext()
	const sheet = getCartSheetContextOptional()
</script>

<a {@attach sheet?.closeOnClick ?? false} href={ctx.lineHref(item)} data-cart-title class={cn('min-w-0 text-sm', className)}>
	<div class="font-medium">{item.product_title}</div>
	{#if item.variant_title}<p class="mt-1 text-muted-foreground">{item.variant_title}</p>{/if}
</a>
