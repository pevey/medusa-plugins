<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	import { pageCount } from './reviews-logic.js'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getReviewsContext()
	const total = $derived(pageCount(ctx.filteredCount, ctx.pageSize))
</script>

<span class={cn('text-sm text-muted-foreground', className)}>Page {ctx.page + 1} of {total}</span>
