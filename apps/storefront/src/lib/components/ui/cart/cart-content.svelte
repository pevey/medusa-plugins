<script lang="ts">
	// Sheet.Content with cart-drawer sizing baked in. Belongs inside <Cart.Sheet>.
	// Override the width/padding wholesale via `class` — the defaults are plain utilities.
	import { cn } from '$lib/utils.js'
	import * as Sheet from '$lib/components/ui/sheet/index.js'
	import type { ComponentProps, Snippet } from 'svelte'

	let {
		side = 'right',
		class: className = '',
		children
	}: {
		side?: ComponentProps<typeof Sheet.Content>['side']
		class?: string
		children: Snippet
	} = $props()
</script>

<Sheet.Content {side} data-cart-content class={cn('w-full! gap-0 overflow-y-auto p-6 sm:w-4/5! sm:max-w-none! md:w-2/3! lg:w-2/3! xl:w-1/2!', className)}>
	{@render children()}
</Sheet.Content>
