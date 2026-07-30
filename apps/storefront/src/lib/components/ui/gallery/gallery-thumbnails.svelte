<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js'
	import { cn } from '$lib/utils.js'
	import { getGalleryContext, getGalleryLayoutContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'

	let {
		class: className = '',
		orientation,
		children
	}: {
		class?: string
		orientation?: 'horizontal' | 'vertical'
		children: Snippet
	} = $props()
	const gallery = getGalleryContext()
	const layout = getGalleryLayoutContext()

	// A left/right rail is vertical; bottom is horizontal — derived from Root's `thumbnails`.
	const vertical = $derived(layout.thumbnails === 'left' || layout.thumbnails === 'right')
	const resolvedOrientation = $derived(orientation ?? (vertical ? 'vertical' : 'horizontal'))
	// Default: the rail replaces the mobile dots at `thumbnailBreakpoint`. Override via `class`.
	const RAIL = {
		sm: 'hidden sm:flex',
		md: 'hidden md:flex',
		lg: 'hidden lg:flex',
		xl: 'hidden xl:flex'
	} as const
</script>

<Carousel.Root
	orientation={resolvedOrientation}
	opts={{ dragFree: true }}
	setApi={a => (gallery.thumbApi = a)}
	class={cn(RAIL[layout.thumbnailBreakpoint], vertical ? 'w-20' : 'w-full', className)}
>
	<Carousel.Content>{@render children()}</Carousel.Content>
</Carousel.Root>
