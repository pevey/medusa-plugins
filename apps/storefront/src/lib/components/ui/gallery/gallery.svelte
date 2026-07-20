<script lang="ts">
	import { untrack } from 'svelte'
	import { cn } from '$lib/utils.js'
	import { GalleryState, setGalleryContext, type GalleryImage } from './ctx.svelte.js'
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
		children
	}: Props = $props()

	const gallery = new GalleryState()
	// Set embla opts/plugins SYNCHRONOUSLY (before children render) so Gallery.Carousel
	// hands them to embla at init — embla can't adopt opts/plugins (e.g. autoplay) after
	// initialization, so a post-mount $effect would be too late. `untrack` = intentionally
	// the initial value only (embla reads these once at init).
	gallery.opts = untrack(() => opts)
	gallery.plugins = untrack(() => plugins)
	setGalleryContext(gallery)

	$effect(() => {
		const all = images.map((img, i) =>
			typeof img === 'string'
				? { url: img, alt, key: `${i}` }
				: { url: img.url, alt, key: img.id ?? `${i}` }
		)
		const filtered = filterString ? all.filter((it) => it.url.includes(filterString)) : all
		gallery.items = filtered.length ? filtered : all
	})

	// Wire main↔thumb sync + expose selected/api to bindables.
	$effect(() => {
		const embla = gallery.mainApi
		if (!embla) return
		const onSelect = () => {
			gallery.selected = embla.selectedScrollSnap()
			gallery.thumbApi?.scrollTo(gallery.selected)
		}
		onSelect()
		embla.on('select', onSelect)
		embla.on('reInit', onSelect)
		return () => {
			embla.off('select', onSelect)
			embla.off('reInit', onSelect)
		}
	})
	$effect(() => {
		selectedIndex = gallery.selected
	})
	$effect(() => {
		api = gallery.mainApi
	})
</script>

<div
	class={cn('flex flex-col gap-4', className)}
	style={`--gallery-peek:${peek === false ? '100%' : peek}`}
>
	{@render children()}
</div>
