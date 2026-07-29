<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewItemContextOptional } from './reviews-item-ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const r = $derived(getReviewItemContextOptional()?.review)
</script>

{#if r?.author_name}<span class={cn('font-medium', className)}>{r.author_name}</span>{/if}
