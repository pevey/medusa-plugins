<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getPageNavContext } from './page-nav-ctx.svelte.js'

	let { class: className = '' }: { class?: string } = $props()
	const ctx = getPageNavContext()
</script>

<span data-page-nav-info class={cn('px-2 text-sm text-muted-foreground', className)}>Page {ctx.page + 1} of {ctx.pageCount}</span>
