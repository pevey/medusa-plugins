<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const ctx = getCheckoutContext()
</script>

<button
	type="button"
	data-checkout-place-order
	disabled={ctx.placing}
	onclick={() => ctx.placeOrder()}
	class={cn(
		'bg-primary text-primary-foreground h-10 w-full rounded-md text-sm font-medium disabled:opacity-50',
		className
	)}
>
	{#if children}{@render children()}{:else}{ctx.placing ? 'Processing…' : 'Place order'}{/if}
</button>
