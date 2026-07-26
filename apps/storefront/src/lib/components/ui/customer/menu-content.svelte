<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { DropdownMenuContent } from '$lib/components/ui/dropdown-menu/index.js'
	import type { Snippet } from 'svelte'

	let { class: className = 'w-48', children }: { class?: string; children: Snippet } = $props()
</script>

<DropdownMenuContent class={cn(className)}>
	{@render children()}
</DropdownMenuContent>
