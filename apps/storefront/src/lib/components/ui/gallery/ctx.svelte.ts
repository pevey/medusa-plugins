import { getContext, setContext } from 'svelte'
import type { CarouselAPI } from '$lib/components/ui/carousel/context.js'
import type { EmblaOptionsType, EmblaPluginType } from 'embla-carousel'
import type { StoreProductImage } from '@medusajs/types'

export type GalleryImage = string | StoreProductImage
export type NormalizedImage = { url: string; alt: string; key: string }

export type ThumbnailPosition = 'left' | 'right' | 'bottom' | 'none'
export type ThumbnailBreakpoint = 'sm' | 'md' | 'lg' | 'xl'

/**
 * Layout intent published by `Gallery.Root` and read by the parts so they can self-arrange
 * (thumbnail rail vs. mobile dots) without the consumer wiring responsive classes by hand.
 * Every part still accepts a `class` that overrides these defaults.
 */
export type GalleryLayout = {
	thumbnails: ThumbnailPosition
	thumbnailBreakpoint: ThumbnailBreakpoint
}

const KEY = Symbol('gallery')
const LAYOUT = Symbol('gallery-layout')

export class GalleryState {
	// Genuinely mutable runtime state, driven by embla events / thumbnail clicks.
	selected = $state(0)
	mainApi = $state<CarouselAPI>()
	thumbApi = $state<CarouselAPI>()

	// Reactive sources wired once by Gallery.Root (thunks over its `$derived`/props). Read through
	// getters so the parts stay reactive without any `$state` syncing (no `$effect`). embla reads
	// opts/plugins once at init; items follows the derived value.
	#items: () => NormalizedImage[] = () => []
	#opts: () => EmblaOptionsType | undefined = () => undefined
	#plugins: () => EmblaPluginType[] | undefined = () => undefined

	get items() {
		return this.#items()
	}
	get opts() {
		return this.#opts()
	}
	get plugins() {
		return this.#plugins()
	}

	setSources(sources: {
		items: () => NormalizedImage[]
		opts: () => EmblaOptionsType | undefined
		plugins: () => EmblaPluginType[] | undefined
	}) {
		this.#items = sources.items
		this.#opts = sources.opts
		this.#plugins = sources.plugins
	}

	/**
	 * The main carousel calls this as its `setApi`. Root overwrites it with a closure that subscribes
	 * to embla `select` and pushes selection to state + the bindable props — no `$effect` needed.
	 */
	registerMain: (api: CarouselAPI | undefined) => void = () => {}

	select(i: number) {
		this.mainApi?.scrollTo(i)
	}
}

export function setGalleryContext(state: GalleryState) {
	setContext(KEY, state)
}
export function getGalleryContext(): GalleryState {
	const ctx = getContext<GalleryState>(KEY)
	if (!ctx) throw new Error('Gallery.* must be used within <Gallery.Root>')
	return ctx
}

export function setGalleryLayoutContext(layout: GalleryLayout) {
	setContext(LAYOUT, layout)
}
/** Falls back to the Root defaults when a part is used without an explicit layout. */
export function getGalleryLayoutContext(): GalleryLayout {
	return getContext<GalleryLayout>(LAYOUT) ?? { thumbnails: 'bottom', thumbnailBreakpoint: 'md' }
}
