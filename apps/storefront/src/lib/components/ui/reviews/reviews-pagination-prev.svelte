<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const ctx = getReviewsContext()
</script>

<button
	type="button"
	class={cn('disabled:opacity-50', className)}
	aria-label="Previous page"
	disabled={ctx.page === 0}
	onclick={() => ctx.setPage(ctx.page - 1)}
	>{#if children}{@render children()}{:else}Previous{/if}</button
>
