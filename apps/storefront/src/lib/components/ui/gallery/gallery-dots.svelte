<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getGalleryContext } from './ctx.svelte.js'

	let { class: className = '' }: { class?: string } = $props()
	const gallery = getGalleryContext()
</script>

{#if gallery.items.length > 1}
	<div class={cn('flex items-center justify-center gap-2', className)}>
		{#each gallery.items as item, i (item.key)}
			<button
				type="button"
				aria-label={`Go to image ${i + 1}`}
				aria-current={gallery.selected === i}
				onclick={() => gallery.select(i)}
				class={cn(
					'h-2 w-2 rounded-full transition',
					gallery.selected === i ? 'bg-primary' : 'bg-muted-foreground/40'
				)}
			></button>
		{/each}
	</div>
{/if}
