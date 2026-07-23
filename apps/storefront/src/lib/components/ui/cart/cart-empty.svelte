<script lang="ts">
	import { cn } from '$lib/utils.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
</script>

<p data-cart-empty class={cn('py-6 text-sm text-muted-foreground', className)}>
	{#if children}{@render children()}{:else}Your cart is empty{/if}
</p>
