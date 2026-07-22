<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getSearchContext, type SearchHit } from './ctx.svelte.js'
	import Hit from './search-hit.svelte'
	import type { Snippet } from 'svelte'

	interface Props {
		static?: boolean
		// Keyboard/ARIA mode, independent of layout. Defaults to `!static` (dropdown →
		// combobox, static page → plain links). Set `combobox` explicitly to combine
		// in-flow layout with arrow-key navigation, e.g. inside <SearchDialog>.
		combobox?: boolean
		href?: (hit: SearchHit) => string
		hit?: Snippet<[SearchHit, { index: number; active: boolean; id: string }]>
		class?: string
	}
	let {
		static: isStatic = false,
		combobox,
		href,
		hit: hitSnippet,
		class: className = ''
	}: Props = $props()

	const state = getSearchContext()

	// `static` controls layout (in-flow vs absolute dropdown); `comboboxMode` controls
	// interaction (listbox/option roles + arrow-key nav). They're decoupled so a dialog
	// can be in-flow AND navigable.
	const comboboxMode = $derived(combobox ?? !isStatic)

	// Publish the interaction mode so Search.Input exposes (or omits) combobox semantics.
	$effect(() => {
		state.combobox = comboboxMode
	})

	const showQuery = $derived(state.query.trim().length >= state.minLength)
	const visible = $derived(isStatic || (state.open && showQuery))
</script>

{#snippet renderItem(item: { hit: SearchHit; index: number })}
	{#if hitSnippet}
		{@render hitSnippet(item.hit, {
			index: item.index,
			active: item.index === state.activeIndex,
			id: state.optionId(item.index)
		})}
	{:else}
		<Hit
			hit={item.hit}
			{href}
			option={comboboxMode}
			active={item.index === state.activeIndex}
			id={state.optionId(item.index)}
		/>
	{/if}
{/snippet}

{#if visible}
	<div
		data-search-results
		role={comboboxMode ? 'listbox' : undefined}
		id={comboboxMode ? state.listboxId : undefined}
		aria-label={comboboxMode ? 'Search results' : undefined}
		class={cn(
			isStatic
				? ''
				: 'bg-popover text-popover-foreground absolute z-50 max-h-[80vh] w-full overflow-auto rounded-b-md border',
			className
		)}
	>
		{#if state.loading && state.hits.length === 0}
			<p class="text-muted-foreground p-4 text-sm">Searching…</p>
		{:else if !showQuery}
			{#if isStatic}
				<p class="text-muted-foreground p-4 text-sm">
					Type at least {state.minLength} characters…
				</p>
			{/if}
		{:else if state.hits.length === 0}
			<p class="text-muted-foreground p-4 text-sm">No results found.</p>
		{:else}
			{#each state.sections as section, si (section.label ?? '__products__')}
				{#if section.label === null}
					{#each section.items as item (item.hit.type + item.hit.id)}
						{@render renderItem(item)}
					{/each}
				{:else}
					{@const headingId = `${state.baseId}-group-${si}`}
					<div role={comboboxMode ? 'group' : undefined} aria-labelledby={comboboxMode ? headingId : undefined}>
						<div
							id={comboboxMode ? headingId : undefined}
							class="text-muted-foreground px-4 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase"
						>
							{section.label}
						</div>
						{#each section.items as item (item.hit.type + item.hit.id)}
							{@render renderItem(item)}
						{/each}
					</div>
				{/if}
			{/each}
		{/if}
	</div>
{/if}
