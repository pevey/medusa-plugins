<script lang="ts">
	import { cn } from '$lib/utils.js'
	import type { Snippet } from 'svelte'

	let { class: className = '', children }: { class?: string; children: Snippet } = $props()
</script>

<dl data-checkout-summary class={cn('space-y-2 text-sm', className)}>
	{@render children()}
</dl>
