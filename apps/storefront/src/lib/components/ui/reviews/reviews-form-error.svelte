<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getReviewFormContext } from './review-form-ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getReviewFormContext()
</script>

{#if ctx.error}
	<p role="alert" class={cn('text-sm text-destructive', className)}>{ctx.error}</p>
{/if}
