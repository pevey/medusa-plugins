<script lang="ts">
	import { mode, toggleMode } from 'mode-watcher'
	import { cn } from '$lib/utils.js'
	import SunIcon from '@lucide/svelte/icons/sun'
	import MoonIcon from '@lucide/svelte/icons/moon'
	import type { Snippet } from 'svelte'

	interface Props {
		class?: string
		sun?: Snippet
		moon?: Snippet
	}
	let { class: className = '', sun, moon }: Props = $props()
	const isLight = $derived(mode.current !== 'dark')
</script>

<button type="button" onclick={toggleMode} class={cn('inline-flex cursor-pointer items-center', className)} aria-label="Toggle theme">
	{#if isLight}
		{#if sun}{@render sun()}{:else}<SunIcon class="size-8" />{/if}
	{:else if moon}{@render moon()}{:else}<MoonIcon class="size-8" />{/if}
	<span class="sr-only">Toggle theme</span>
</button>
