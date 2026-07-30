<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js'
	import * as ImageZoom from '$lib/components/ui/image-zoom'
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
	// Present only when a <Gallery.Root zoom> (ImageZoom.Root) wraps us. Renders click-to-zoom
	// triggers instead of plain images — no consumer wiring needed.
	const zoom = ImageZoom.getImageZoomContextOptional()
</script>

{#snippet defaultImg({ src, alt }: { src: string; alt: string; index: number })}
	<img {src} {alt} class={cn('mx-auto h-auto max-h-[70vh] w-auto rounded-[var(--radius)] object-contain', className)} />
{/snippet}

{#snippet zoomImg({ src, alt }: { src: string; alt: string; index: number })}
	<ImageZoom.Trigger {src} {alt} class={cn('mx-auto h-auto max-h-[70vh] w-auto cursor-zoom-in rounded-[var(--radius)] object-contain', className)} />
{/snippet}

{#each gallery.items as item, i (item.key)}
	<Carousel.Item class={cn('basis-[var(--gallery-peek)] md:basis-full', className)}>
		{@render (child ?? (zoom ? zoomImg : defaultImg))({ src: item.url, alt: item.alt, index: i })}
	</Carousel.Item>
{/each}
