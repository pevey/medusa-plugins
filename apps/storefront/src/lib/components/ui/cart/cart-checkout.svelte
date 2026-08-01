<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { buttonVariants, type ButtonSize, type ButtonVariant } from '$lib/components/ui/button/index.js'
	import { getCartContext, getCartSheetContextOptional } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'
	let {
		class: className = '',
		variant = 'default',
		size = 'default',
		children
	}: { class?: string; variant?: ButtonVariant; size?: ButtonSize; children?: Snippet } = $props()
	const ctx = getCartContext()
	const sheet = getCartSheetContextOptional()
</script>

<a {@attach sheet?.closeOnClick ?? false} data-cart-checkout href={ctx.checkoutUrl} class={cn(buttonVariants({ variant, size }), 'w-full', className)}>
	{#if children}{@render children()}{:else}Go to Checkout{/if}
</a>
