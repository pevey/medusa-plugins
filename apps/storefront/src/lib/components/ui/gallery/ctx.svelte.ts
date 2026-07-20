import { getContext, setContext } from 'svelte'
import type { CarouselAPI } from '$lib/components/ui/carousel/context.js'
import type { EmblaOptionsType, EmblaPluginType } from 'embla-carousel'
import type { StoreProductImage } from '@medusajs/types'

export type GalleryImage = string | StoreProductImage
export type NormalizedImage = { url: string; alt: string; key: string }

const KEY = Symbol('gallery')

export class GalleryState {
	items = $state<NormalizedImage[]>([])
	selected = $state(0)
	mainApi = $state<CarouselAPI>()
	thumbApi = $state<CarouselAPI>()
	opts = $state<EmblaOptionsType | undefined>(undefined)
	plugins = $state<EmblaPluginType[] | undefined>(undefined)

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
