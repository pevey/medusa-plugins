<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutContext, getCheckoutLineContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const ctx = getCheckoutContext()
	const { item } = getCheckoutLineContext()
</script>

<button type="button" data-checkout-remove class={cn('text-sm text-muted-foreground hover:text-foreground disabled:opacity-50', className)} disabled={ctx.placing} onclick={() => ctx.removeItem(item.id)}>{#if children}{@render children()}{:else}Remove{/if}</button>
