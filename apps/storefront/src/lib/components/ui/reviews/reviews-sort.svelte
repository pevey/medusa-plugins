<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	const ctx = getReviewsContext()
	let { class: className = '' }: { class?: string } = $props()
	const options = [
		{ value: '-created_at', label: 'Newest' },
		{ value: 'created_at', label: 'Oldest' },
		{ value: '-rating', label: 'Highest rated' },
		{ value: 'rating', label: 'Lowest rated' }
	]
</script>
{#if ctx.count > 0}
	<label class={cn('inline-flex items-center gap-2 text-sm', className)}>
		<span>Sort by:</span>
		<select
			class="border-input bg-background rounded-md border px-2 py-1"
			value={ctx.order}
			onchange={(e) => ctx.setOrder((e.currentTarget as HTMLSelectElement).value)}
		>
			{#each options as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
		</select>
	</label>
{/if}
