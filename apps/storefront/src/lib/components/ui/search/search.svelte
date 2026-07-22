<script lang="ts">
	import { untrack } from 'svelte'
	import { cn } from '$lib/utils.js'
	import { SearchState, setSearchContext, type SearchFn } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'

	interface Props {
		search?: SearchFn
		// minLength / debounce have no defaults here on purpose: `undefined` flows
		// through to SearchState, which owns the single canonical default (2 / 200)
		// so this and <SearchBox> can never drift apart.
		minLength?: number
		debounce?: number
		limit?: number
		class?: string
		children: Snippet
	}
	let { search, minLength, debounce, limit, class: className = '', children }: Props = $props()

	const uid = $props.id()
	const state = untrack(
		() => new SearchState({ search, minLength, debounce, limit, baseId: uid })
	)
	setSearchContext(state)

	function closeOnOutside(node: HTMLElement) {
		const handler = (e: MouseEvent) => {
			if (!node.contains(e.target as Node)) state.close()
		}
		document.addEventListener('click', handler)
		return () => document.removeEventListener('click', handler)
	}
</script>

<div {@attach closeOnOutside} class={cn('relative', className)}>
	{@render children()}
</div>
