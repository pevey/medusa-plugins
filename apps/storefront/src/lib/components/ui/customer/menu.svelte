<script lang="ts">
	import { DropdownMenu } from '$lib/components/ui/dropdown-menu/index.js'
	import type { Snippet } from 'svelte'

	let { children }: { children: Snippet } = $props()
</script>

<DropdownMenu>
	{@render children()}
</DropdownMenu>
