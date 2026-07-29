<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Button } from '$lib/components/ui/button/index.js'
	import { cn } from '$lib/utils.js'
	import { getReviewFormContext } from './review-form-ctx.svelte.js'
	let { class: className = '', children }: { class?: string; children: Snippet } = $props()
	const ctx = getReviewFormContext()
</script>

<Button type="submit" disabled={ctx.submitting} class={cn('', className)}
	>{@render children()}</Button
>
