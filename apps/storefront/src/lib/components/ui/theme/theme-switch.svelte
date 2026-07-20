<script lang="ts">
	import { Switch } from '$lib/components/ui/switch/index.js'
	import { mode, setMode } from 'mode-watcher'
	import type { RemoteForm } from '@sveltejs/kit'

	interface Props {
		onMode?: 'light' | 'dark'
		size?: 'sm' | 'default'
		class?: string
		'aria-label'?: string
		form?: RemoteForm<any, any>
		field?: string
	}
	let {
		onMode = 'light',
		size = 'default',
		class: className = '',
		'aria-label': ariaLabel = 'Toggle theme',
		form,
		field
	}: Props = $props()

	const otherMode = $derived<'light' | 'dark'>(onMode === 'light' ? 'dark' : 'light')
	const checked = $derived(mode.current === onMode)

	function onCheckedChange(v: boolean) {
		setMode(v ? onMode : otherMode) // theme changes immediately
	}
</script>

{#if form && field}
	<!-- Additive form participation: a visually-hidden native checkbox carries the remote-form
	     binding; its checked state mirrors the theme so a settings form submits the choice.
	     `type="checkbox"` is supplied by `.as('checkbox')`. -->
	<input
		class="sr-only"
		tabindex={-1}
		aria-hidden="true"
		{...form.fields[field].as('checkbox')}
		checked={checked}
	/>
{/if}
<Switch {size} {checked} {onCheckedChange} class={className} aria-label={ariaLabel} />
