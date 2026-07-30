<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getGalleryContext, getGalleryLayoutContext } from './ctx.svelte.js'

	let { class: className = '' }: { class?: string } = $props()
	const gallery = getGalleryContext()
	const layout = getGalleryLayoutContext()

	// Mirror of the rail: dots show below `thumbnailBreakpoint` (and always when there is no rail).
	// Override via `class`.
	const DOTS = {
		sm: 'flex sm:hidden',
		md: 'flex md:hidden',
		lg: 'flex lg:hidden',
		xl: 'flex xl:hidden'
	} as const
	const visibility = $derived(layout.thumbnails === 'none' ? 'flex' : DOTS[layout.thumbnailBreakpoint])
</script>

{#if gallery.items.length > 1}
	<div class={cn('items-center justify-center gap-2', visibility, className)}>
		{#each gallery.items as item, i (item.key)}
			<button
				type="button"
				aria-label={`Go to image ${i + 1}`}
				aria-current={gallery.selected === i}
				onclick={() => gallery.select(i)}
				class={cn('h-2 w-2 rounded-full transition', gallery.selected === i ? 'bg-primary' : 'bg-muted-foreground/40')}
			></button>
		{/each}
	</div>
{/if}
