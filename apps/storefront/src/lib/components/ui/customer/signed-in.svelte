<script lang="ts">
	// Reads the customer asynchronously (`experimental.async`, `$derived(await getCustomer())`) and
	// wraps its own render in a `<svelte:boundary>`, so it suspends on its own while the customer
	// loads — consumers don't need an external boundary.
	import { getCustomer } from 'sveltekit-medusa-sdk/customer'
	import type { Snippet } from 'svelte'

	let { children }: { children: Snippet } = $props()

	const customer = $derived(await getCustomer())
</script>

<svelte:boundary>
	{#if customer}
		{@render children()}
	{/if}
	{#snippet pending()}{/snippet}
</svelte:boundary>
