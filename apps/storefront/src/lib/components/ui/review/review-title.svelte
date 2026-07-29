<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewItemContextOptional } from './reviews-item-ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const r = $derived(getReviewItemContextOptional()?.review)
</script>

{#if r?.title}<h3 class={cn('font-semibold', className)}>{r.title}</h3>{/if}
