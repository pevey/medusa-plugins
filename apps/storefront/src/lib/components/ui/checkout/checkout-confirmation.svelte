<script lang="ts">
	import { getCheckoutContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const ctx = getCheckoutContext()
</script>

{#if ctx.order}
	<div data-checkout-confirmation class={className}>
		{#if children}
			{@render children()}
		{:else}
			<h2 class="text-lg font-semibold">Thank you for your order</h2>
			<p class="text-sm">Order #{ctx.order.display_id ?? ctx.order.id}</p>
			<p class="text-muted-foreground text-sm">{ctx.order.email}</p>
			<ul class="mt-4 space-y-1 text-sm">
				{#each ctx.order.items ?? [] as item (item.id)}
					<li>{item.title} × {item.quantity}</li>
				{/each}
			</ul>
			<p class="mt-4 font-medium">
				Total: {formatPrice(ctx.order.total, ctx.order.currency_code)}
			</p>
		{/if}
	</div>
{/if}
