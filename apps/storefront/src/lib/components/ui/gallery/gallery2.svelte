<script lang="ts">
	import * as Gallery from './index.js'
	import * as ImageZoom from '$lib/components/ui/image-zoom'
	import { cn } from '$lib/utils.js'
	import type { CarouselAPI } from '$lib/components/ui/carousel/context.js'
	import type { EmblaOptionsType, EmblaPluginType } from 'embla-carousel'
	import type { GalleryImage } from './ctx.svelte.js'

	interface Props {
		images: GalleryImage[]
		filterString?: string
		peek?: string | false
		opts?: EmblaOptionsType
		plugins?: EmblaPluginType[]
		alt?: string
		class?: string
		api?: CarouselAPI
		selectedIndex?: number
		thumbnails?: 'left' | 'right' | 'bottom' | 'none'
		thumbnailBreakpoint?: 'sm' | 'md' | 'lg' | 'xl'
	}
	let {
		images,
		filterString,
		peek = '85%',
		opts,
		plugins,
		alt = '',
		class: className = '',
		api = $bindable(),
		selectedIndex = $bindable(0),
		thumbnails = 'bottom',
		thumbnailBreakpoint = 'md'
	}: Props = $props()

	const vertical = $derived(thumbnails === 'left' || thumbnails === 'right')
	const DIR = {
		left: 'flex-row',
		right: 'flex-row-reverse',
		bottom: 'flex-col-reverse',
		none: 'flex-col'
	} as const
	const RAIL = {
		sm: 'hidden sm:flex',
		md: 'hidden md:flex',
		lg: 'hidden lg:flex',
		xl: 'hidden xl:flex'
	} as const
	const DOTS = {
		sm: 'flex sm:hidden',
		md: 'flex md:hidden',
		lg: 'flex lg:hidden',
		xl: 'flex xl:hidden'
	} as const
</script>

<Gallery.Root
	{images}
	{filterString}
	{peek}
	{opts}
	{plugins}
	{alt}
	bind:api
	bind:selectedIndex
	class={cn(DIR[thumbnails], className)}
>
	{#if thumbnails !== 'none'}
		<Gallery.Thumbnails
			orientation={vertical ? 'vertical' : 'horizontal'}
			class={cn(RAIL[thumbnailBreakpoint], vertical ? 'w-20' : 'w-full')}
		>
			<Gallery.ThumbnailImage />
		</Gallery.Thumbnails>
	{/if}
	<div class="flex min-w-0 flex-1 flex-col">
		<ImageZoom.Root>
			<Gallery.Carousel>
				<Gallery.Image>
					{#snippet child({ src, alt })}
						<ImageZoom.Trigger
							{src}
							{alt}
							class="mx-auto h-auto max-h-[70vh] w-auto cursor-zoom-in rounded-[var(--radius)] object-contain"
						/>
					{/snippet}
				</Gallery.Image>
			</Gallery.Carousel>
		</ImageZoom.Root>
		<Gallery.Dots class={cn('mt-3', thumbnails === 'none' ? 'flex' : DOTS[thumbnailBreakpoint])} />
	</div>
</Gallery.Root>
