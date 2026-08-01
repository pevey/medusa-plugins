<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Button, type ButtonSize, type ButtonVariant } from '$lib/components/ui/button/index.js'
	import { cn } from '$lib/utils.js'
	import { getReviewFormContext } from './review-form-ctx.svelte.js'
	let {
		class: className = '',
		variant = 'secondary',
		size = 'default',
		children
	}: { class?: string; variant?: ButtonVariant; size?: ButtonSize; children: Snippet } = $props()
	const ctx = getReviewFormContext()
</script>

<Button type="button" {variant} {size} onclick={() => ctx.setOpen(false)} class={cn('', className)}>{@render children()}</Button>
