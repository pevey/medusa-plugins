<script lang="ts">
	import { cn } from '$lib/utils.js'
	import type { Snippet } from 'svelte'

	// Groups the carousel + dots into one column so a left/right thumbnail rail sits beside them.
	// Purely a layout wrapper — style it with the `class` prop.
	let { class: className = '', children }: { class?: string; children: Snippet } = $props()
</script>

<div class={cn('flex min-w-0 flex-1 flex-col', className)}>
	{@render children()}
</div>
