<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { buttonVariants } from '$lib/components/ui/button/index.js'
	import { getCartContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const ctx = getCartContext()
</script>

<a
	data-cart-checkout
	href={ctx.checkoutUrl}
	class={cn(buttonVariants({ variant: 'default' }), 'w-full', className)}
>
	{#if children}{@render children()}{:else}Go to Checkout{/if}
</a>
