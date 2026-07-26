<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { DropdownMenuTrigger } from '$lib/components/ui/dropdown-menu/index.js'
	import type { Snippet } from 'svelte'

	let { class: className = '', children }: { class?: string; children: Snippet } = $props()
</script>

<DropdownMenuTrigger class={cn(className)}>
	{@render children()}
</DropdownMenuTrigger>
