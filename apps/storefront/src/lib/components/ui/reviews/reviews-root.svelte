<script lang="ts">
	import { cn } from '$lib/utils.js'
	// Import review remotes from the /reviews subpath: svelte-check cannot resolve them
	// through the package barrel (the SDK's ./* export maps this straight to reviews.remote).
	import { getReviewSummary, getReviews } from 'sveltekit-medusa-sdk/reviews'
	import { getProductContextOptional } from '../product/ctx.svelte.js'
	import { setReviewsContext } from './reviews-ctx.svelte.js'
	import * as logic from './reviews-logic.js'
	import type { StoreReview, ReviewSummary, SummaryQuery, ReviewsQuery } from '../review/review-types.js'
	import type { Snippet } from 'svelte'

	let {
		reviews,
		productId,
		featured,
		rating: initialRating,
		pageSize = 10,
		class: className = '',
		children
	}: {
		reviews?: StoreReview[]
		productId?: string
		featured?: boolean
		rating?: number
		pageSize?: number
		class?: string
		children: Snippet<
			[{ reviews: StoreReview[]; summary: ReviewSummary | null | undefined; count: number; page: number; pageCount: number }]
		>
	} = $props()

	// Headless when a `reviews` array is supplied directly; otherwise this Root fetches
	// for a product (explicit `productId` prop, or the ambient Product context).
	const headless = $derived(reviews !== undefined)
	const id = $derived(productId ?? getProductContextOptional()?.product?.id ?? '')

	let order = $state('-created_at')
	let page = $state(0)
	// One-time seed from the `rating` prop (uncontrolled-input pattern): after mount `rating`
	// is owned by this component's own state (via setRating), not synced back to the prop.
	// svelte-ignore state_referenced_locally
	let rating = $state<number | null>(initialRating ?? null)
	let submitted = $state<StoreReview[]>([])

	// --- Headless: client-side filter → sort → paginate over the supplied array ---
	const filtered = $derived(headless ? (rating ? reviews!.filter((r) => r.rating === rating) : reviews!) : [])
	const sorted = $derived(
		headless
			? [...filtered].sort((a, b) => {
					switch (order) {
						case 'created_at':
							return a.created_at.localeCompare(b.created_at)
						case '-created_at':
							return b.created_at.localeCompare(a.created_at)
						case 'rating':
							return a.rating - b.rating
						case '-rating':
							return b.rating - a.rating
						default:
							return 0
					}
				})
			: []
	)
	const paged = $derived(sorted.slice(page * pageSize, page * pageSize + pageSize))

	// --- Fetch: SDK-backed for a product, combined with optimistic `submitted` pushes ---
	const summaryQ = $derived(
		!headless && id ? (getReviewSummary({ productId: id }) as unknown as SummaryQuery) : null
	)
	const listQ = $derived(
		!headless && id
			? (getReviews({
					productId: id,
					order,
					limit: pageSize,
					offset: page * pageSize,
					...(featured ? { featured } : {}),
					...(rating ? { rating } : {})
				}) as unknown as ReviewsQuery)
			: null
	)
	const fetchedReviews = $derived.by(() => {
		const list = listQ?.current?.reviews ?? []
		if (!submitted.length) return list
		const seen = new Set(submitted.map((r) => r.id))
		return [...submitted, ...list.filter((r) => !seen.has(r.id))]
	})

	const visible = $derived(headless ? paged : fetchedReviews)
	const summary = $derived(headless ? null : summaryQ?.current)
	const count = $derived(headless ? (reviews?.length ?? 0) : (summaryQ?.current?.count ?? 0))
	const filteredCount = $derived(headless ? filtered.length : (listQ?.current?.count ?? count))
	const pageCount = $derived(logic.pageCount(filteredCount, pageSize))

	setReviewsContext({
		get productId() {
			return id
		},
		get summary() {
			return summary
		},
		get reviews() {
			return visible
		},
		get count() {
			return count
		},
		get filteredCount() {
			return filteredCount
		},
		get loading() {
			return headless ? false : ((summaryQ?.loading || listQ?.loading) ?? false)
		},
		get error() {
			return headless ? undefined : (summaryQ?.error ?? listQ?.error)
		},
		get rating() {
			return rating
		},
		get order() {
			return order
		},
		get page() {
			return page
		},
		get pageSize() {
			return pageSize
		},
		setRating: (n) => {
			rating = rating === n ? null : n
			page = 0
		},
		setOrder: (s) => {
			order = s
			page = 0
		},
		setPage: (n) => {
			page = n
		},
		pushReview: (review) => {
			submitted = [review, ...submitted.filter((r) => r.id !== review.id)]
		}
	})
</script>

<div class={cn('', className)} data-reviews>
	{@render children({ reviews: visible, summary, count, page, pageCount })}
</div>
