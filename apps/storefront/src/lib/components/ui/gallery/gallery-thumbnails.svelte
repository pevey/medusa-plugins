<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js'
	import { cn } from '$lib/utils.js'
	import { getGalleryContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'

	let {
		class: className = '',
		orientation = 'horizontal',
		children
	}: {
		class?: string
		orientation?: 'horizontal' | 'vertical'
		children: Snippet
	} = $props()
	const gallery = getGalleryContext()
</script>

<Carousel.Root
	{orientation}
	opts={{ dragFree: true }}
	setApi={(a) => (gallery.thumbApi = a)}
	class={cn('w-full', className)}
>
	<Carousel.Content>{@render children()}</Carousel.Content>
</Carousel.Root>
