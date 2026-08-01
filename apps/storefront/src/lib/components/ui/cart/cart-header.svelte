<script lang="ts">
	// The drawer's heading. Always emits a Sheet.Title plus an sr-only Sheet.Description, because
	// a dialog without both is an a11y hole (and bits-ui warns about it) — `children` replaces the
	// heading's *content*, never the elements themselves.
	// Note this is the cart's own heading; the per-line product title is <Cart.Title>.
	import { cn } from '$lib/utils.js'
	import * as Sheet from '$lib/components/ui/sheet/index.js'
	import type { Snippet } from 'svelte'

	let {
		title = 'Cart',
		description = 'Your shopping cart',
		class: className = '',
		titleClass = '',
		children
	}: {
		title?: string
		description?: string
		class?: string
		titleClass?: string
		children?: Snippet
	} = $props()
</script>

<Sheet.Header data-cart-header class={cn('p-0', className)}>
	<Sheet.Title class={cn('text-center text-2xl font-semibold', titleClass)}>
		{#if children}{@render children()}{:else}{title}{/if}
	</Sheet.Title>
	<Sheet.Description class="sr-only">{description}</Sheet.Description>
</Sheet.Header>
