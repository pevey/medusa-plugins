<script lang="ts">
	import { cn } from '$lib/utils.js'
	import Star from '../review/star.svelte'
	import { getReviewFormContext } from './review-form-ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getReviewFormContext()
	const field = $derived(ctx.form.fields.rating)
	// Source of truth is the checked radio; `selected`/`hovered` drive the visual fill (event-handler
	// state only, no $effect). `checked`/`onchange` are supplied explicitly (rather than relying solely
	// on the pair `.as('radio', value)` returns) so the hover preview and click-to-select both funnel
	// through the same local state.
	let selected = $state(0)
	let hovered = $state(0)
	const shown = $derived(hovered || selected)
	const issues = $derived(field.issues())
</script>

<fieldset class={cn('flex flex-col gap-1', className)} data-review-rating>
	<div class="flex items-center gap-1" role="radiogroup" aria-label="Rating">
		{#each [1, 2, 3, 4, 5] as value (value)}
			<label
				class="cursor-pointer rounded focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
				onmouseenter={() => (hovered = value)}
				onmouseleave={() => (hovered = 0)}
			>
				<input
					class="sr-only"
					{...field.as('radio', value)}
					checked={selected === value}
					onchange={() => (selected = value)}
					aria-label={`${value} star${value > 1 ? 's' : ''}`}
				/>
				<Star fill={shown >= value ? 1 : 0} />
			</label>
		{/each}
	</div>
	{#if issues && issues.length}
		<p class="text-sm text-destructive">{issues[0].message}</p>
	{/if}
</fieldset>
