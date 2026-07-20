<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js'
	import { mode, toggleMode } from 'mode-watcher'
	import SunIcon from '@lucide/svelte/icons/sun'
	import MoonIcon from '@lucide/svelte/icons/moon'
	import type { ComponentProps, Snippet } from 'svelte'

	interface Props {
		size?: ComponentProps<typeof Button>['size']
		variant?: ComponentProps<typeof Button>['variant']
		class?: string
		sun?: Snippet
		moon?: Snippet
	}
	let { size = 'icon', variant = 'ghost', class: className = '', sun, moon }: Props = $props()
	const isLight = $derived(mode.current !== 'dark')
</script>

<Button {variant} {size} onclick={toggleMode} class={className} aria-label="Toggle theme">
	{#if isLight}
		{#if sun}{@render sun()}{:else}<SunIcon />{/if}
	{:else}
		{#if moon}{@render moon()}{:else}<MoonIcon />{/if}
	{/if}
	<span class="sr-only">Toggle theme</span>
</Button>
