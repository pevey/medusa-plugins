<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getSearchContext, type SearchHit } from './ctx.svelte.js'

	interface Props {
		hit: SearchHit
		href?: (hit: SearchHit) => string
		// Combobox wiring, supplied by Search.Results in dropdown mode. When `option`
		// is set the link becomes an ARIA listbox option (kept out of the tab order —
		// arrow keys + activedescendant drive selection). Omitted → a plain link.
		option?: boolean
		active?: boolean
		id?: string
		class?: string
	}
	let { hit, href, option = false, active = false, id, class: className = '' }: Props = $props()

	const state = getSearchContext()

	// Editable route map — content slugs resolve at the site root.
	const ROUTES: Record<string, string> = {
		product: '/products',
		category: '/categories',
		collection: '/collections',
		content: ''
	}

	const resolved = $derived(href?.(hit) ?? `${ROUTES[hit.type] ?? ''}/${hit.slug}`)

	// Keep the highlighted option scrolled into view within the results panel.
	// Attachment re-runs when `option`/`active` change.
	function scrollActiveIntoView(node: HTMLAnchorElement) {
		if (option && active) node.scrollIntoView({ block: 'nearest' })
	}
</script>

<a
	{@attach scrollActiveIntoView}
	href={resolved}
	{id}
	role={option ? 'option' : undefined}
	aria-selected={option ? active : undefined}
	tabindex={option ? -1 : undefined}
	onclick={() => state.close()}
	class={cn(
		'text-popover-foreground hover:bg-accent block overflow-hidden p-4 text-left no-underline',
		option && active && 'bg-accent',
		className
	)}
>
	<h3 class="font-semibold">{hit.title}</h3>
	{#if hit.snippet}
		<p class="text-muted-foreground line-clamp-4 text-sm">{hit.snippet}</p>
	{/if}
</a>
