<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js'
	import { cn } from '$lib/utils.js'
	import { getGalleryContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'

	let { class: className = '', children }: { class?: string; children: Snippet } = $props()
	const gallery = getGalleryContext()
</script>

<Carousel.Root
	opts={gallery.opts}
	plugins={gallery.plugins}
	setApi={(a) => (gallery.mainApi = a)}
	class={cn('min-w-0 flex-1', className)}
>
	<Carousel.Content>{@render children()}</Carousel.Content>
</Carousel.Root>
