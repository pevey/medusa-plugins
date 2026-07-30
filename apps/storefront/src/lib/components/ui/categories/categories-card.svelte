<script lang="ts">
	import { cn } from '$lib/utils.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import type { StoreProductCategory } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		category: StoreProductCategory
		href?: string | ((c: StoreProductCategory) => string)
		/** Metadata key holding the image URL — Medusa categories have no image field. */
		imageKey?: string
		class?: string
		image?: Snippet<[{ src: string; alt: string }]>
		children?: Snippet<[{ category: StoreProductCategory }]>
	}
	let { category, href, imageKey = 'thumbnail', class: className = '', image, children }: Props = $props()

	const url = $derived(typeof href === 'function' ? href(category) : (href ?? `/categories/${category.handle}`))
	const src = $derived(typeof category.metadata?.[imageKey] === 'string' ? (category.metadata[imageKey] as string) : '')
</script>

<Card.Root data-category-card class={cn('pt-0', className)}>
	{#if children}
		{@render children({ category })}
	{:else}
		<a href={url} data-category-card-link class="block">
			{#if image}
				{@render image({ src, alt: category.name })}
			{:else if src}
				<img data-category-card-image {src} alt={category.name} loading="lazy" class="aspect-video w-full rounded-t-xl object-cover" />
			{/if}
		</a>
		<Card.Content class="flex flex-col gap-2">
			<a href={url} class="hover:underline">
				<h3 class="text-base font-medium">{category.name}</h3>
			</a>
			{#if category.description}
				<p data-category-card-description class="text-sm text-muted-foreground">{category.description}</p>
			{/if}
		</Card.Content>
	{/if}
</Card.Root>
