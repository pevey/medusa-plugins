<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { setPageNavContext } from './page-nav-ctx.svelte.js'
	import Prev from './page-nav-prev.svelte'
	import Pages from './page-nav-pages.svelte'
	import Next from './page-nav-next.svelte'
	import type { Snippet } from 'svelte'

	let {
		page,
		pageCount,
		pageParam = 'p',
		class: className = '',
		children
	}: { page: number; pageCount: number; pageParam?: string; class?: string; children?: Snippet } = $props()

	setPageNavContext({
		get page() {
			return page
		},
		get pageCount() {
			return pageCount
		},
		get pageParam() {
			return pageParam
		}
	})
</script>

{#if pageCount > 1}
	<nav data-page-nav aria-label="Pagination" class={cn('flex items-center justify-center gap-1', className)}>
		{#if children}
			{@render children()}
		{:else}
			<Prev />
			<Pages />
			<Next />
		{/if}
	</nav>
{/if}
