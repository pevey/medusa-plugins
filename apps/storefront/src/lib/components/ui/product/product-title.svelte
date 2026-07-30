<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getProductContext } from './ctx.svelte.js'

	// `as` exists so a card in a grid can render an h3 — a page must not contain 24 h1s.
	let { class: className = '', as = 'h1' }: { class?: string; as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' } = $props()
	const ctx = getProductContext()
</script>

<svelte:element this={as} class={cn('text-2xl font-semibold', className)}>{ctx.product?.title}</svelte:element>
