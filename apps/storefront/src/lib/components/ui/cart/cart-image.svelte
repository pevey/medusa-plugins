<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCartContext, getCartLineContext, getCartSheetContextOptional } from './ctx.svelte.js'
	let { class: className = '', fallback }: { class?: string; fallback?: string } = $props()
	const ctx = getCartContext()
	const { item } = getCartLineContext()
	const sheet = getCartSheetContextOptional()
	const src = $derived(item.thumbnail || fallback || '')
</script>

<a {@attach sheet?.closeOnClick ?? false} href={ctx.lineHref(item)} data-cart-image class="flex-shrink-0">
	{#if src}
		<img
			{src}
			alt={item.variant_title ? `${item.product_title} — ${item.variant_title}` : item.product_title}
			class={cn('h-24 w-auto rounded-md object-cover', className)}
		/>
	{/if}
</a>
