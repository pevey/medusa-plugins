<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js'
	import { userPrefersMode, setMode } from 'mode-watcher'
	import type { RemoteForm } from '@sveltejs/kit'

	interface Props {
		size?: 'sm' | 'default'
		class?: string
		'aria-label'?: string
		form?: RemoteForm<any, any>
		field?: string
	}
	let {
		size = 'default',
		class: className = '',
		'aria-label': ariaLabel = 'Theme',
		form,
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

{#if form && field}
	<!-- Additive form participation: a visually-hidden native input carries the remote-form
	     binding; its value mirrors the theme so a settings form submits the choice. -->
	<input
		class="sr-only"
		tabindex={-1}
		aria-hidden="true"
		{...form.fields[field].as('text')}
		value={value}
	/>
{/if}
<Select.Root type="single" {value} {onValueChange}>
	<Select.Trigger {size} class={className} aria-label={ariaLabel}>{triggerLabel}</Select.Trigger>
	<Select.Content>
		{#each OPTIONS as opt (opt.value)}
			<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
