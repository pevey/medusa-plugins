<script lang="ts">
	import { cn } from '$lib/utils.js'
	import * as Sheet from '$lib/components/ui/sheet/index.js'
	import type { Snippet } from 'svelte'
	import type { ComponentProps } from 'svelte'

	let { side = 'right', class: className = '', trigger, children }:
		{ side?: ComponentProps<typeof Sheet.Content>['side']; class?: string; trigger?: Snippet; children: Snippet } = $props()
</script>

<Sheet.Root>
	{#if trigger}{@render trigger()}{/if}
	<Sheet.Content {side} class={cn('flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg', className)}>
		{@render children()}
	</Sheet.Content>
</Sheet.Root>
