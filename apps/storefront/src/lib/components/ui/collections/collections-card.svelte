<script lang="ts">
	import { cn } from '$lib/utils.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import type { StoreCollection } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		collection: StoreCollection
		href?: string | ((c: StoreCollection) => string)
		/** Metadata key holding the image URL — Medusa collections have no image field. */
		imageKey?: string
		class?: string
		image?: Snippet<[{ src: string; alt: string }]>
		children?: Snippet<[{ collection: StoreCollection }]>
	}
	let { collection, href, imageKey = 'thumbnail', class: className = '', image, children }: Props = $props()

	const url = $derived(typeof href === 'function' ? href(collection) : (href ?? `/collections/${collection.handle}`))
	const src = $derived(typeof collection.metadata?.[imageKey] === 'string' ? (collection.metadata[imageKey] as string) : '')
</script>

<Card.Root data-collection-card class={cn('pt-0', className)}>
	{#if children}
		{@render children({ collection })}
	{:else}
		<a href={url} data-collection-card-link class="block">
			{#if image}
				{@render image({ src, alt: collection.title })}
			{:else if src}
				<img data-collection-card-image {src} alt={collection.title} loading="lazy" class="aspect-video w-full rounded-t-xl object-cover" />
			{/if}
		</a>
		<Card.Content>
			<a href={url} class="hover:underline">
				<h3 class="text-base font-medium">{collection.title}</h3>
			</a>
		</Card.Content>
	{/if}
</Card.Root>
