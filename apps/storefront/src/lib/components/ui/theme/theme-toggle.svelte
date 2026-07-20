<script lang="ts">
	import { Toggle } from '$lib/components/ui/toggle/index.js'
	import { mode, toggleMode } from 'mode-watcher'
	import SunIcon from '@lucide/svelte/icons/sun'
	import MoonIcon from '@lucide/svelte/icons/moon'
	import type { ComponentProps, Snippet } from 'svelte'

	interface Props {
		size?: ComponentProps<typeof Toggle>['size']
		variant?: ComponentProps<typeof Toggle>['variant']
		onMode?: 'light' | 'dark'
		label?: string
		class?: string
		sun?: Snippet
		moon?: Snippet
	}
	let {
		size = 'default',
		variant = 'outline',
		onMode = 'light',
		label = 'Mode',
		class: className = '',
		sun,
		moon
	}: Props = $props()
	const isLight = $derived(mode.current !== 'dark')
	const pressed = $derived(mode.current === onMode)
</script>

<Toggle
	{variant}
	{size}
	{pressed}
	onPressedChange={() => toggleMode()}
	class={className}
	aria-label="Toggle theme"
>
	{#if isLight}
		{#if sun}{@render sun()}{:else}<SunIcon />{/if}
	{:else}
		{#if moon}{@render moon()}{:else}<MoonIcon />{/if}
	{/if}
	{label}
</Toggle>
