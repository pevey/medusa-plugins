<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getProductContext } from './ctx.svelte.js'

	let { class: className = '', loading = 'lazy', sizes, alt }: { class?: string; loading?: 'lazy' | 'eager'; sizes?: string; alt?: string } = $props()
	const ctx = getProductContext()
	const src = $derived(ctx.product?.thumbnail ?? '')
</script>

{#if src}
	<img data-product-thumbnail {src} alt={alt ?? ctx.product?.title ?? ''} {loading} {sizes} class={cn('aspect-square w-full object-cover', className)} />
{/if}
