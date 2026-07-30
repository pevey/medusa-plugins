<script lang="ts">
	import { cn } from '$lib/utils.js'
	import Card from './categories-card.svelte'
	import { getCategoriesContext } from './categories-ctx.svelte.js'
	import type { StoreProductCategory } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	let { class: className = '', children, empty }: { class?: string; children?: Snippet<[{ category: StoreProductCategory }]>; empty?: Snippet } = $props()
	const ctx = getCategoriesContext()
</script>

{#if ctx.categories.length}
	<div data-categories-grid aria-busy={ctx.loading || undefined} class={cn('grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
		{#each ctx.categories as category (category.id)}
			{#if children}
				{@render children({ category })}
			{:else}
				<Card {category} href={ctx.href} imageKey={ctx.imageKey} />
			{/if}
		{/each}
	</div>
{:else if !ctx.loading && empty}
	{@render empty()}
{/if}
