<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getProductContext } from './ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getProductContext()
</script>

{#if ctx.product?.subtitle}
	<p class={cn('text-sm text-muted-foreground', className)}>{ctx.product.subtitle}</p>
{/if}
