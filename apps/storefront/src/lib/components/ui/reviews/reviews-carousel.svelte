<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js'
	import { cn } from '$lib/utils.js'
	import { getReviewsContextOptional } from './reviews-ctx.svelte.js'
	import Item from '../review/review-item.svelte'
	import type { StoreReview } from '../review/review-types.js'
	import type { EmblaOptionsType } from 'embla-carousel'
	import type { Snippet } from 'svelte'

	let {
		reviews,
		opts = { loop: true },
		class: className = '',
		children
	}: {
		reviews?: StoreReview[]
		opts?: EmblaOptionsType
		class?: string
		children: Snippet
	} = $props()

	const resolved = $derived(reviews ?? getReviewsContextOptional()?.reviews ?? [])
</script>

{#if resolved.length}
	<Carousel.Root {opts}>
		<Carousel.Content>
			{#each resolved as review (review.id)}
				<Carousel.Item class={cn('basis-full md:basis-1/2 lg:basis-1/3', className)}>
					<Item {review}>{@render children()}</Item>
				</Carousel.Item>
			{/each}
		</Carousel.Content>
		<Carousel.Previous />
		<Carousel.Next />
	</Carousel.Root>
{/if}
