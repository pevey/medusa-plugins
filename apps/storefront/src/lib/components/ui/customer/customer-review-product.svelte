<script lang="ts">
	// Links a "my reviews" row back to its product. `GET /store/customers/me/reviews` enriches
	// each review with `product.title/handle/thumbnail` (see the ratings plugin route) for exactly
	// this purpose — `StoreReview` itself (the surface-neutral core type) doesn't declare `product`,
	// so it's typed locally here and read defensively (the product may be missing, e.g. deleted).
	import { cn } from '$lib/utils.js'
	import { getReviewItemContextOptional } from '../review/reviews-item-ctx.svelte.js'
	import type { StoreReview } from '../review/review-types.js'

	type ReviewWithProduct = StoreReview & {
		product?: { title?: string | null; handle?: string | null; thumbnail?: string | null } | null
	}

	let { class: className = '' }: { class?: string } = $props()

	const review = $derived(getReviewItemContextOptional()?.review as ReviewWithProduct | undefined)
	const product = $derived(review?.product)
	const title = $derived(product?.title ?? 'View product')
	const href = $derived(product?.handle ? `/product/${product.handle}` : null)
</script>

{#if review?.product_id}
	{#if href}
		<a {href} class={cn('inline-flex items-center gap-2 text-sm font-medium hover:underline', className)} data-review-product>
			{#if product?.thumbnail}
				<img src={product.thumbnail} alt="" class="h-8 w-8 flex-shrink-0 rounded object-cover" />
			{/if}
			{title}
		</a>
	{:else}
		<span class={cn('text-muted-foreground text-sm', className)} data-review-product>{title}</span>
	{/if}
{/if}
