<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js'
	import { setCartSheetContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'

	let { open = $bindable(false), children }: { open?: boolean; children: Snippet } = $props()

	setCartSheetContext({
		closeOnClick: (node: HTMLElement) => {
			const close = () => (open = false)
			node.addEventListener('click', close)
			return () => node.removeEventListener('click', close)
		}
	})
</script>

<Sheet.Root bind:open>
	{@render children()}
</Sheet.Root>
