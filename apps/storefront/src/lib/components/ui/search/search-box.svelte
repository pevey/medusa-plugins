<script lang="ts">
	import * as Search from './index.js'
	import { cn } from '$lib/utils.js'
	import type { SearchFn, SearchHit } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'

	interface Props {
		breakpoint?: 'sm' | 'md' | 'lg' | 'xl'
		searchUrl?: string
		placeholder?: string
		minLength?: number
		debounce?: number
		limit?: number
		search?: SearchFn
		href?: (hit: SearchHit) => string
		icon?: Snippet
		class?: string
	}
	let {
		breakpoint = 'md',
		searchUrl = '/search',
		placeholder = 'Search',
		// minLength / debounce intentionally undefaulted — passed through to
		// <Search.Root>, which lets SearchState own the single default (2 / 200).
		minLength,
		debounce,
		limit,
		search,
		href,
		icon,
		class: className = ''
	}: Props = $props()

	const EXPANDED = {
		sm: 'hidden sm:block',
		md: 'hidden md:block',
		lg: 'hidden lg:block',
		xl: 'hidden xl:block'
	} as const
	const COLLAPSED = {
		sm: 'sm:hidden',
		md: 'md:hidden',
		lg: 'lg:hidden',
		xl: 'xl:hidden'
	} as const
</script>

<!-- Expanded: full box with live-results dropdown. -->
<div data-search-expanded class={cn(EXPANDED[breakpoint], 'w-full max-w-xl', className)}>
	<Search.Root {search} {minLength} {debounce} {limit}>
		<Search.Input {placeholder} {icon} />
		<Search.Results {href} />
	</Search.Root>
</div>

<!-- Collapsed: icon-only link to the full search page. -->
<a
	data-search-collapsed
	href={searchUrl}
	aria-label="Search"
	class={cn(COLLAPSED[breakpoint], 'text-foreground inline-flex items-center p-2')}
>
	{#if icon}
		<Search.Icon>{@render icon()}</Search.Icon>
	{:else}
		<Search.Icon />
	{/if}
</a>
