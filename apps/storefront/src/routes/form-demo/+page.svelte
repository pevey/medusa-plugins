<script lang="ts">
	import { contact } from './data.remote'
	import { Button } from '$lib/components/ui/button'
	import InputText from '$lib/components/ui/input-text/input-text.svelte'
	import InputSelect from '$lib/components/ui/input-select/input-select.svelte'
	import type { SelectOption } from '$lib/components/ui/input-select/input-select.svelte'
	import ThemeSwitch from '$lib/components/ui/theme/theme-switch.svelte'

	const countries: SelectOption[] = [
		{ value: 'us', label: 'United States' },
		{ value: 'ca', label: 'Canada' },
		{ value: 'gb', label: 'United Kingdom' }
	]
</script>

<div class="mx-auto max-w-md space-y-6 p-8">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Form fields</h1>
		<ThemeSwitch />
	</div>

	<form {...contact} class="space-y-4">
		<InputText field={contact.fields.name} label="Name" />
		<InputText field={contact.fields.email} type="email" label="Email" />
		<InputSelect
			field={contact.fields.country}
			label="Country"
			placeholder="Select a country…"
			options={countries}
		/>
		<InputText field={contact.fields.message} type="textarea" label="Message" />
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium">Dark mode (submitted with the form)</span>
			<ThemeSwitch field={contact.fields.darkMode} onMode="dark" aria-label="Dark mode" />
		</div>
		<Button type="submit">Send</Button>
	</form>

	{#if contact.result?.success}
		<p class="text-sm text-green-600">Sent! (demo — no data stored)</p>
	{/if}
</div>
