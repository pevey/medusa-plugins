<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewsContext } from './reviews-ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getReviewsContext()
</script>

{#if ctx.count > 0}<span class={cn('text-sm text-muted-foreground', className)}>{ctx.count} reviews</span>{/if}
