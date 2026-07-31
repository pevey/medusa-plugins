<script lang="ts">
	import { untrack } from 'svelte'
	import { cn } from '$lib/utils.js'
	import { SearchState, setSearchContext } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'

	interface Props {
		// minLength / debounce have no defaults here on purpose: `undefined` flows
		// through to SearchState, which owns the single canonical default (2 / 200)
		// so this and <SearchBox> can never drift apart.
		minLength?: number
		debounce?: number
		limit?: number
		/**
		 * Seed the query from outside the input — typically a `?q=` URL param on a
		 * full-page search route. Runs the search on mount, and again whenever this
		 * value changes (e.g. client-side navigation to a different term).
		 *
		 * One-way: nothing is written back to the URL, and the dropdown is not opened.
		 * Leave undefined to opt out entirely; pass `''` to clear.
		 */
		query?: string
		class?: string
		children: Snippet
	}
	let { minLength, debounce, limit, query, class: className = '', children }: Props = $props()

	const uid = $props.id()
	const state = untrack(() => new SearchState({ minLength, debounce, limit, baseId: uid }))
	setSearchContext(state)

	function closeOnOutside(node: HTMLElement) {
		const handler = (e: MouseEvent) => {
			if (!node.contains(e.target as Node)) state.close()
		}
		document.addEventListener('click', handler)
		return () => document.removeEventListener('click', handler)
	}

	// An attachment rather than an $effect: attachments run only in the browser (so SSR
	// never fires a search) and re-run when the state they read changes — which is exactly
	// the seeding contract. Reading `query` in the template expression is what tracks it.
	const seedQuery = (q: string) => () => state.seed(q)
</script>

<div {@attach closeOnOutside} {@attach query !== undefined && seedQuery(query)} class={cn('relative', className)}>
	{@render children()}
</div>
