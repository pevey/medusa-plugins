<script lang="ts">
	// Same as SignedIn but inverted: renders children only when there is no signed-in customer.
	import { getCustomer } from 'sveltekit-medusa-sdk/customer'
	import type { Snippet } from 'svelte'

	let { children }: { children: Snippet } = $props()

	const customer = $derived(await getCustomer())
</script>

<svelte:boundary>
	{#if !customer}
		{@render children()}
	{/if}
	{#snippet pending()}{/snippet}
</svelte:boundary>
