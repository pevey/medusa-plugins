<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewItemContextOptional } from './reviews-item-ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const r = $derived(getReviewItemContextOptional()?.review)
</script>

{#if r?.body}<p class={cn('whitespace-pre-wrap', className)}>{r.body}</p>{/if}
