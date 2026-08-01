<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { buttonVariants, type ButtonSize, type ButtonVariant } from '$lib/components/ui/button/index.js'
	import { DropdownMenuTrigger } from '$lib/components/ui/dropdown-menu/index.js'
	import type { Snippet } from 'svelte'

	let {
		class: className = '',
		variant = 'default',
		size = 'default',
		children
	}: { class?: string; variant?: ButtonVariant; size?: ButtonSize; children?: Snippet } = $props()
</script>

{#if children}
	<DropdownMenuTrigger class={cn('inline-flex cursor-pointer items-center', className)}>
		{@render children()}
	</DropdownMenuTrigger>
{:else}
	<DropdownMenuTrigger class={cn(buttonVariants({ variant, size }), className)}>Account Menu</DropdownMenuTrigger>
{/if}
