<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js'
	import { userPrefersMode, setMode } from 'mode-watcher'
	import type { RemoteFormField } from '@sveltejs/kit'

	interface Props {
		size?: 'sm' | 'default'
		class?: string
		'aria-label'?: string
		field?: RemoteFormField<any>
	}
	let {
		size = 'default',
		class: className = '',
		'aria-label': ariaLabel = 'Theme',
		field
	}: Props = $props()

	const OPTIONS = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'system', label: 'System' }
	] as const

	// userPrefersMode is always one of light|dark|system → never empty (no placeholder).
	const value = $derived(userPrefersMode.current)
	const triggerLabel = $derived(OPTIONS.find((o) => o.value === value)?.label ?? 'Theme')

	function onValueChange(v: string) {
		setMode(v as 'light' | 'dark' | 'system') // theme changes immediately
	}
</script>

{#if field}
	<!-- Additive form participation: hidden native input carries the light|dark|system string. -->
	<input class="sr-only" tabindex={-1} aria-hidden="true" {...field.as('text')} value={value} />
{/if}
<Select.Root type="single" {value} {onValueChange}>
	<Select.Trigger {size} class={className} aria-label={ariaLabel}>{triggerLabel}</Select.Trigger>
	<Select.Content>
		{#each OPTIONS as opt (opt.value)}
			<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
