<script lang="ts">
	import { cn } from '$lib/utils.js'
	import * as ImageZoom from '$lib/components/ui/image-zoom'
	import {
		GalleryState,
		setGalleryContext,
		setGalleryLayoutContext,
		type GalleryImage,
		type ThumbnailPosition,
		type ThumbnailBreakpoint
	} from './ctx.svelte.js'
	import type { CarouselAPI } from '$lib/components/ui/carousel/context.js'
	import type { EmblaOptionsType, EmblaPluginType } from 'embla-carousel'
	import type { Snippet } from 'svelte'

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
		/** Thumbnail rail position; also sets the Root flex direction. Published to the parts. */
		thumbnails?: ThumbnailPosition
		/** Viewport at which the rail replaces the mobile dots. Published to the parts. */
		thumbnailBreakpoint?: ThumbnailBreakpoint
		/** Enable click-to-zoom: wraps the children in an ImageZoom overlay that Gallery.Image detects. */
		zoom?: boolean
		children: Snippet
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
		thumbnailBreakpoint = 'md',
		zoom = false,
		children
	}: Props = $props()

	// Root sets the flex direction; the rail/dots parts pick up the rest from layout context.
	const DIR = {
		left: 'flex-row',
		right: 'flex-row-reverse',
		bottom: 'flex-col-reverse',
		none: 'flex-col'
	} as const

	// Reactive getters (no `$effect`) so the parts see prop changes and it stays SSR-safe.
	setGalleryLayoutContext({
		get thumbnails() {
			return thumbnails
		},
		get thumbnailBreakpoint() {
			return thumbnailBreakpoint
		}
	})

	const gallery = new GalleryState()

	// Normalize + filter images. `$derived` (not `$effect` writing to state) so it is SSR-safe
	// and the parts read it reactively through `gallery.items`.
	const items = $derived.by(() => {
		const all = images.map((img, i) =>
			typeof img === 'string'
				? { url: img, alt, key: `${i}` }
				: { url: img.url, alt, key: img.id ?? `${i}` }
		)
		const filtered = filterString ? all.filter((it) => it.url.includes(filterString)) : all
		return filtered.length ? filtered : all
	})

	// Wire the reactive sources once. embla reads opts/plugins a single time at init (it can't
	// adopt them afterwards), so plain getters are correct — no `untrack`, no init-only `$state`.
	gallery.setSources({
		items: () => items,
		opts: () => opts,
		plugins: () => plugins
	})

	// The main carousel reports its embla api here (its `setApi`). Subscribe imperatively — this is
	// an external event source, not derived state. embla removes these listeners when the carousel
	// unmounts (it destroys the instance), so there is nothing to clean up and no `$effect` needed.
	gallery.registerMain = (embla) => {
		gallery.mainApi = embla
		api = embla
		if (!embla) return
		const sync = () => {
			const i = embla.selectedScrollSnap()
			gallery.selected = i
			selectedIndex = i
			gallery.thumbApi?.scrollTo(i)
		}
		sync()
		embla.on('select', sync)
		embla.on('reInit', sync)
	}

	setGalleryContext(gallery)
</script>

<div
	class={cn('flex gap-4', DIR[thumbnails], className)}
	style={`--gallery-peek:${peek === false ? '100%' : peek}`}
>
	{#if zoom}
		<ImageZoom.Root>{@render children()}</ImageZoom.Root>
	{:else}
		{@render children()}
	{/if}
</div>
