<script lang="ts">
	// Deliberately minimal: `Reviews.Form` drives the *create* flow through
	// `reviewForm`, a native SvelteKit remote-`form()` whose `field.as(...)`/`issues()` API
	// `updateReview` (a `command`, not a `form`) doesn't provide — reusing it for edit would need
	// a new command-backed form driver, which is a larger, separate design decision than this
	// task's scope. Until that shared edit-form exists, this is a thin toggle: inline
	// rating/title/body fields seeded from the current review, `updateReview` on save, then
	// refresh. Reads the per-item review from context set by `<Reviews.List>`/`<Review>`.
	import { Button } from '$lib/components/ui/button/index.js'
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { cn } from '$lib/utils.js'
	import { updateReview, getMyReviews } from 'sveltekit-medusa-sdk/reviews'
	import { getReviewsContext } from '../reviews/reviews-ctx.svelte.js'
	import { getReviewItemContextOptional } from '../review/reviews-item-ctx.svelte.js'
	import Star from '../review/star.svelte'

	let {
		onsuccess,
		onerror,
		class: className = ''
	}: {
		onsuccess?: () => void
		onerror?: (error: unknown) => void
		class?: string
	} = $props()

	const ctx = getReviewsContext()
	const review = $derived(getReviewItemContextOptional()?.review)

	let open = $state(false)
	let pending = $state(false)
	let rating = $state(0)
	let title = $state('')
	let body = $state('')

	function startEdit() {
		if (!review) return
		rating = review.rating
		title = review.title ?? ''
		body = review.body
		open = true
	}

	async function handleSave() {
		const productId = review?.product_id
		if (pending || !review || !productId) return
		pending = true
		try {
			await updateReview({
				productId,
				reviewId: review.id,
				rating,
				title: title || undefined,
				body,
				author_name: review.author_name
			})
			await getMyReviews({
				order: ctx.order,
				limit: ctx.pageSize,
				offset: ctx.page * ctx.pageSize
			}).refresh()
			open = false
			onsuccess?.()
		} catch (e) {
			onerror?.(e)
		} finally {
			pending = false
		}
	}
</script>

{#if review}
	<div class={cn('flex flex-col gap-2', className)} data-review-edit>
		{#if !open}
			<Button type="button" variant="secondary" size="sm" onclick={startEdit} data-review-edit-open>Edit</Button>
		{:else}
			<fieldset class="flex flex-col gap-2" data-review-edit-form>
				<div class="flex items-center gap-1" role="radiogroup" aria-label="Rating">
					{#each [1, 2, 3, 4, 5] as value (value)}
						<label class="cursor-pointer">
							<input
								type="radio"
								class="sr-only"
								name="rating"
								checked={rating === value}
								onchange={() => (rating = value)}
								aria-label={`${value} star${value > 1 ? 's' : ''}`}
							/>
							<Star fill={rating >= value ? 1 : 0} />
						</label>
					{/each}
				</div>
				<Label for="customer-review-edit-title">Title (optional)</Label>
				<input
					id="customer-review-edit-title"
					type="text"
					class="h-9 rounded-md border border-input bg-transparent px-2.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
					bind:value={title}
				/>
				<Label for="customer-review-edit-body">Review</Label>
				<Textarea id="customer-review-edit-body" bind:value={body} />
				<div class="flex gap-2">
					<Button type="button" size="sm" disabled={pending} onclick={handleSave} data-review-edit-save>
						{pending ? 'Saving…' : 'Save'}
					</Button>
					<Button type="button" variant="secondary" size="sm" disabled={pending} onclick={() => (open = false)}>Cancel</Button>
				</div>
			</fieldset>
		{/if}
	</div>
{/if}
