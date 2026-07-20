<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js'
	import { cn } from '$lib/utils.js'
	import { getGalleryContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'

	let {
		class: className = '',
		child
	}: {
		class?: string
		child?: Snippet<[{ src: string; alt: string; index: number }]>
	} = $props()
	const gallery = getGalleryContext()
</script>

{#snippet defaultImg({ src, alt }: { src: string; alt: string; index: number })}
	<img
		{src}
		{alt}
		class={cn(
			'mx-auto h-auto max-h-[70vh] w-auto rounded-[var(--radius)] object-contain',
			className
		)}
	/>
{/snippet}

{#each gallery.items as item, i (item.key)}
	<Carousel.Item class={cn('basis-[var(--gallery-peek)] md:basis-full', className)}>
		{@render (child ?? defaultImg)({ src: item.url, alt: item.alt, index: i })}
	</Carousel.Item>
{/each}
