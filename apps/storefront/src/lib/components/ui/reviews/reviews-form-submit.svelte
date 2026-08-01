<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Button, type ButtonSize, type ButtonVariant } from '$lib/components/ui/button/index.js'
	import { cn } from '$lib/utils.js'
	import { getReviewFormContext } from './review-form-ctx.svelte.js'
	let {
		class: className = '',
		variant = 'default',
		size = 'default',
		children
	}: { class?: string; variant?: ButtonVariant; size?: ButtonSize; children: Snippet } = $props()
	const ctx = getReviewFormContext()
</script>

<Button type="submit" {variant} {size} disabled={ctx.submitting} class={cn('', className)}>{@render children()}</Button>
