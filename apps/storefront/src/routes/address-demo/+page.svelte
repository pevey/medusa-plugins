<script lang="ts">
	import { address } from './data.remote'
	import { getRegions, countriesFromRegions } from 'sveltekit-medusa-sdk'
	import InputSelectCountry from '$lib/components/ui/input-select-country/input-select-country.svelte'
	import InputSelectState from '$lib/components/ui/input-select-state/input-select-state.svelte'
	import InputPostalCode from '$lib/components/ui/input-postal-code/input-postal-code.svelte'

	let lastChange = $state('')
	// One handler for every field — dispatch on target.name (the reference pattern).
	function onchange(event: Event) {
		const t = event.target as HTMLInputElement
		lastChange = `${t.name} = ${t.value}`
	}
</script>

<div class="mx-auto max-w-md space-y-6 p-8">
	<h1 class="text-2xl font-bold">Address inputs</h1>
	<form {...address} class="space-y-4">
		{#await getRegions() then regions}
			<InputSelectCountry field={address.fields.country_code} countries={countriesFromRegions(regions)} label="Country" placeholder="Select a country…" {onchange} />
		{/await}
		<InputSelectState field={address.fields.province} label="State" placeholder="Select a state…" {onchange} />
		<InputPostalCode field={address.fields.postal_code} label="Postal code" {onchange} />
		<button class="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm font-medium">Save</button>
	</form>
	{#if lastChange}<p class="text-sm text-muted-foreground">last change: <code>{lastChange}</code></p>{/if}
	{#if address.result?.success}<p class="text-sm text-green-600">Saved! (demo)</p>{/if}
</div>
