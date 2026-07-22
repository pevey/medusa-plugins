<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import * as Search from './index.js'
	import { cn } from '$lib/utils.js'
	import type { SearchFn, SearchHit } from './ctx.svelte.js'
	import type { Snippet } from 'svelte'

	interface Props {
		search?: SearchFn
		minLength?: number
		debounce?: number
		limit?: number
		href?: (hit: SearchHit) => string
		placeholder?: string
		// Key that, with Ctrl (or Cmd on macOS), toggles the dialog. Default: 'k'.
		shortcut?: string
		// Whether the global keyboard shortcut is active.
		enabled?: boolean
		open?: boolean
		// Optional trigger; receives an opener fn, e.g. a header "Search ⌘K" button.
		trigger?: Snippet<[() => void]>
		icon?: Snippet
		class?: string
	}
	let {
		search,
		minLength,
		debounce,
		limit,
		href,
		placeholder = 'Search…',
		shortcut = 'k',
		enabled = true,
		open = $bindable(false),
		trigger,
		icon,
		class: className = ''
	}: Props = $props()

	function onWindowKeydown(e: KeyboardEvent) {
		if (!enabled) return
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === shortcut.toLowerCase()) {
			e.preventDefault()
			open = !open
		}
	}

	// Close the dialog once a result link is activated (covers mouse click and the
	// keyboard Enter path, which triggers the highlighted option's own click).
	function onResultsClick(e: MouseEvent) {
		if ((e.target as HTMLElement).closest('a')) open = false
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{@render trigger?.(() => (open = true))}

<Dialog.Root bind:open>
	<Dialog.Content
		class={cn('gap-0 overflow-hidden p-0 sm:max-w-lg', className)}
		showCloseButton={false}
	>
		<Dialog.Title class="sr-only">Search</Dialog.Title>
		<Dialog.Description class="sr-only">Search the store. Results update as you type.</Dialog.Description>
		<Search.Root {search} {minLength} {debounce} {limit}>
			<Search.Input
				{placeholder}
				{icon}
				class="h-12 rounded-none border-0 border-b shadow-none focus-visible:ring-0"
			/>
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div onclick={onResultsClick} class="max-h-[60vh] overflow-y-auto">
				<Search.Results static combobox {href} />
			</div>
		</Search.Root>
	</Dialog.Content>
</Dialog.Root>
