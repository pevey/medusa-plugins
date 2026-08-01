<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Button, type ButtonSize, type ButtonVariant } from '$lib/components/ui/button/index.js'
	import { cn } from '$lib/utils.js'
	import { getAuthFormContext } from './ctx.svelte.js'
	let {
		class: className = '',
		variant = 'default',
		size = 'default',
		children
	}: { class?: string; variant?: ButtonVariant; size?: ButtonSize; children: Snippet } = $props()
	const ctx = getAuthFormContext()
</script>

<Button type="submit" {variant} {size} disabled={ctx.submitting} class={cn('w-full', className)}>{@render children()}</Button>
