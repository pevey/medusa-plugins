<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getReviewsContext()
</script>

{#if ctx.summary}<span class={cn('text-3xl font-bold', className)}>{ctx.summary.average}</span>{/if}
