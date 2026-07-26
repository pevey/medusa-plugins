<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCartContext, getCartLineContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const ctx = getCartContext()
	const { item } = getCartLineContext()
</script>

<button
	type="button"
	data-cart-remove
	class={cn('text-sm text-muted-foreground hover:text-foreground disabled:opacity-50', className)}
	disabled={ctx.pending}
	onclick={() => ctx.removeItem(item.id)}
>
	{#if children}
		{@render children()}
	{:else}
		Remove
	{/if}</button
>
