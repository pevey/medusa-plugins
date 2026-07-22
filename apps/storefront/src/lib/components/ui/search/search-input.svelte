<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getSearchContext } from './ctx.svelte.js'
	import Icon from './search-icon.svelte'
	import type { Snippet } from 'svelte'

	interface Props {
		placeholder?: string
		class?: string
		icon?: Snippet
		[key: string]: unknown
	}
	let { placeholder = 'Search', class: className = '', icon, ...rest }: Props = $props()

	const state = getSearchContext()

	const inputId = $derived(`${state.baseId}-input`)
	// Whether a results popup is currently shown (drives aria-expanded).
	const expanded = $derived(state.open && state.query.trim().length >= state.minLength)

	function onkeydown(e: KeyboardEvent) {
		if (!state.combobox) return
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				state.moveActive(1)
				break
			case 'ArrowUp':
				e.preventDefault()
				state.moveActive(-1)
				break
			case 'Enter': {
				const id = state.activeOptionId
				if (id) {
					// Activate the highlighted option by triggering its link.
					e.preventDefault()
					document.getElementById(id)?.click()
				}
				break
			}
			case 'Escape':
				// No preventDefault: let Escape also bubble to an enclosing Dialog
				// (search-dialog) so it can close. Still dismisses the navbar dropdown.
				if (state.open) state.close()
				break
		}
	}

	const inputClass =
		'border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 block h-10 w-full rounded-md border bg-transparent py-2 pr-3 pl-10 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] md:text-sm'
</script>

<div class="relative">
	<div
		class="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
	>
		{#if icon}
			<Icon class="size-4">{@render icon()}</Icon>
		{:else}
			<Icon class="size-4" />
		{/if}
	</div>
	<label for={inputId} class="sr-only">Search</label>
	<input
		id={inputId}
		type="search"
		role={state.combobox ? 'combobox' : undefined}
		aria-expanded={state.combobox ? expanded : undefined}
		aria-controls={state.combobox && expanded ? state.listboxId : undefined}
		aria-autocomplete={state.combobox ? 'list' : undefined}
		aria-activedescendant={state.combobox ? state.activeOptionId : undefined}
		{placeholder}
		bind:value={state.query}
		oninput={() => state.onInput()}
		onfocus={() => {
			if (state.query.trim().length >= state.minLength) state.open = true
		}}
		{onkeydown}
		class={cn(inputClass, className)}
		{...rest}
	/>
</div>
