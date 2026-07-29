<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	import { pageCount } from './reviews-logic.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const ctx = getReviewsContext()
	const last = $derived(pageCount(ctx.filteredCount, ctx.pageSize) - 1)
</script>
<button
	type="button"
	class={cn('disabled:opacity-50', className)}
	aria-label="Next page"
	disabled={ctx.page >= last}
	onclick={() => ctx.setPage(ctx.page + 1)}
>{#if children}{@render children()}{:else}Next{/if}</button>
