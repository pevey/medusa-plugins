<script lang="ts">
	// bits-ui's underlying menu Item supports the `child` snippet (asChild pattern) via
	// `WithChild<...>`, so an `href` renders the item as a real anchor carrying the item's a11y/
	// interaction props, instead of a button that navigates imperatively.
	import { cn } from '$lib/utils.js'
	import { DropdownMenuItem } from '$lib/components/ui/dropdown-menu/index.js'
	import type { Snippet } from 'svelte'

	let { href, class: className = '', children }: { href?: string; class?: string; children: Snippet } = $props()
</script>

{#if href}
	<DropdownMenuItem class={cn(className)}>
		{#snippet child({ props })}
			<a {href} {...props}>{@render children()}</a>
		{/snippet}
	</DropdownMenuItem>
{:else}
	<DropdownMenuItem class={cn(className)}>
		{@render children()}
	</DropdownMenuItem>
{/if}
