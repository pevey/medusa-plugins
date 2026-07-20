<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js'
	import { cn } from '$lib/utils.js'
	import { getGalleryContext } from './ctx.svelte.js'

	let { class: className = '' }: { class?: string } = $props()
	const gallery = getGalleryContext()
</script>

{#each gallery.items as item, i (item.key)}
	<Carousel.Item class="basis-1/4">
		<button
			type="button"
			aria-label={`View image ${i + 1}`}
			aria-current={gallery.selected === i}
			onclick={() => gallery.select(i)}
			class={cn(
				'block overflow-hidden rounded-[var(--radius)] border-2 transition',
				gallery.selected === i
					? 'border-primary'
					: 'border-transparent opacity-70 hover:opacity-100',
				className
			)}
		>
			<img src={item.url} alt="" class="h-full w-full object-cover" />
		</button>
	</Carousel.Item>
{/each}
