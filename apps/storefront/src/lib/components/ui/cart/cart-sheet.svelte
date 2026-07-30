<script lang="ts">
	import { cn } from '$lib/utils.js'
	import * as Sheet from '$lib/components/ui/sheet/index.js'
	import type { Snippet } from 'svelte'
	import type { ComponentProps } from 'svelte'

	let {
		side = 'right',
		class: className = '',
		trigger,
		children
	}: {
		side?: ComponentProps<typeof Sheet.Content>['side']
		class?: string
		trigger?: Snippet
		children: Snippet
	} = $props()
</script>

<Sheet.Root>
	{#if trigger}
		{@render trigger()}
	{/if}
	<Sheet.Content {side} class={cn('w-full! gap-0 overflow-y-auto sm:w-4/5! sm:max-w-none! md:w-2/3! lg:w-2/3! xl:w-1/2!', className)}>
		{@render children()}
	</Sheet.Content>
</Sheet.Root>
