<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { setCheckoutLineContext } from './ctx.svelte.js'
	import type { CheckoutLine } from './types.js'
	import type { Snippet } from 'svelte'
	let { item, class: className = '', children, actions }: { item: CheckoutLine; class?: string; children: Snippet; actions?: Snippet } = $props()
	setCheckoutLineContext({ get item() { return item } })
</script>

<li data-checkout-line class={cn('flex gap-4 py-4', className)}>
	{@render children()}
	{#if actions}<div data-checkout-line-actions>{@render actions()}</div>{/if}
</li>
