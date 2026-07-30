<script lang="ts">
	// Mirrors `signed-in.svelte`: `$derived(await getMyReviews(...))` inside a `<svelte:boundary>`,
	// so this Root suspends on its own while the customer's reviews load — no external boundary
	// needed. Unlike `Reviews.Root`'s per-product fetch, "my reviews" spans products, so there's no single
	// per-product aggregate to expose — this context is populated `summary`-free.
	//
	// The `{#if result}` below isn't just a null-guard: the Svelte compiler only ties a
	// `<svelte:boundary>`'s pending state to an async `$derived` when the derived is read
	// directly in the boundary's own markup (as `signed-in.svelte` does with `{#if customer}`).
	// `result` is otherwise only read indirectly, through the `setReviewsContext` getters
	// consumed by `<Reviews.List>` et al. — without a direct read here, the boundary wouldn't
	// know to wait, and those children would mount before `setReviewsContext`'s backing data
	// (and even before `result` itself) is ready.
	import { getMyReviews } from 'sveltekit-medusa-sdk/reviews'
	import { setReviewsContext } from '../reviews/reviews-ctx.svelte.js'
	import type { Snippet } from 'svelte'

	let {
		pageSize = 10,
		children
	}: {
		pageSize?: number
		children: Snippet
	} = $props()

	// Star-rating filtering isn't wired for "my reviews" (a customer's own list is short and
	// spans products, so filtering by rating adds little) — `rating`/`setRating` are kept as
	// inert state so the shared `ReviewsListContext` shape is fully satisfied.
	let rating = $state<number | null>(null)
	let order = $state('-created_at')
	let page = $state(0)

	// `setReviewsContext` MUST run synchronously during Root's own initialization — Svelte
	// forbids `setContext` after an `await` (`set_context_after_init`), and any code textually
	// after the `$derived(await ...)` below is compiled into a task deferred until that promise
	// settles. So this is declared *before* `result`, closing over it by reference; the getters
	// aren't actually called until `<Reviews.List>` renders, which (per the `{#if result}` gate
	// below) only happens once `result` is assigned.
	setReviewsContext({
		// No single per-product aggregate spans "my reviews" across products, so `summary` is
		// always null and `productId` is empty — same inert-satisfy-the-shape rationale as
		// `rating`/`pushReview` below.
		get productId() {
			return ''
		},
		get summary() {
			return null
		},
		get reviews() {
			return result?.reviews ?? []
		},
		get count() {
			return result?.count ?? 0
		},
		get filteredCount() {
			return result?.count ?? 0
		},
		get loading() {
			return false
		},
		get error() {
			return undefined
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
		setRating: n => {
			rating = n
		},
		setOrder: s => {
			order = s
			page = 0
		},
		setPage: n => {
			page = n
		},
		// No local "just submitted" list to splice in here (unlike `Reviews.Root`'s fetch mode,
		// which merges a freshly-created review ahead of the next fetch) — `Customer.Reviews` has no
		// create form, so this is a no-op kept to satisfy the shared context shape.
		pushReview: () => {}
	})

	const result = $derived(
		await getMyReviews({
			order,
			limit: pageSize,
			offset: page * pageSize
		})
	)
</script>

<svelte:boundary>
	{#if result}
		{@render children()}
	{/if}
	{#snippet pending()}{/snippet}
</svelte:boundary>
