<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutLineContext } from './ctx.svelte.js'
	let { class: className = '', href = '#', fallback }: { class?: string; href?: string; fallback?: string } = $props()
	const { item } = getCheckoutLineContext()
	const src = $derived(item.thumbnail || fallback || '')
</script>

<a {href} data-checkout-image class="flex-shrink-0">
	{#if src}<img {src} alt={item.variant_title ? `${item.product_title} — ${item.variant_title}` : item.product_title} class={cn('h-24 w-auto rounded-md object-cover', className)} />{/if}
</a>
