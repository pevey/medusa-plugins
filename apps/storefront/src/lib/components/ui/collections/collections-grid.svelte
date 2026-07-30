<script lang="ts">
	import { cn } from '$lib/utils.js'
	import Card from './collections-card.svelte'
	import { getCollectionsContext } from './collections-ctx.svelte.js'
	import type { StoreCollection } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	let { class: className = '', children, empty }: { class?: string; children?: Snippet<[{ collection: StoreCollection }]>; empty?: Snippet } = $props()
	const ctx = getCollectionsContext()
</script>

{#if ctx.collections.length}
	<div data-collections-grid aria-busy={ctx.loading || undefined} class={cn('grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
		{#each ctx.collections as collection (collection.id)}
			{#if children}
				{@render children({ collection })}
			{:else}
				<Card {collection} href={ctx.href} imageKey={ctx.imageKey} />
			{/if}
		{/each}
	</div>
{:else if !ctx.loading && empty}
	{@render empty()}
{/if}
