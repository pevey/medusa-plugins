<script lang="ts">
	import { cn } from '$lib/utils.js'
	import * as Sheet from '$lib/components/ui/sheet/index.js'
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag'
	import Badge from './cart-badge.svelte'
	import type { Snippet } from 'svelte'

	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
</script>

<Sheet.Trigger data-cart-trigger class={cn('relative inline-flex cursor-pointer items-center', className)}>
	{#if children}
		{@render children()}
	{:else}
		<ShoppingBag class="size-8" />
		<Badge />
		<span class="sr-only">Cart</span>
	{/if}
</Sheet.Trigger>
