<script lang="ts">
	import * as PageNav from '$lib/components/ui/page-nav/index.js'
	import { getCategoriesContext } from './categories-ctx.svelte.js'
	import type { Snippet } from 'svelte'

	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const ctx = getCategoriesContext()
</script>

<PageNav.Root page={ctx.page} pageCount={ctx.pageCount} pageParam={ctx.pageParam} class={className}>
	{#if children}
		{@render children()}
	{:else}
		<PageNav.Prev />
		<PageNav.Pages />
		<PageNav.Next />
	{/if}
</PageNav.Root>
