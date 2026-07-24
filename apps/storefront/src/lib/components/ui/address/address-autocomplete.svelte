<script lang="ts">
	import GooglePlacesAutocomplete from '../google-places-autocomplete/google-places-autocomplete.svelte'
	import InputText from '../input-text/input-text.svelte'
	import * as Field from '$lib/components/ui/field/index.js'
	import { getAddressContext } from './ctx.svelte.js'
	import type { NormalizedAddress } from '../google-places-autocomplete/types'

	let { label = 'Address', prefix = '', placeholder = 'Enter address', class: className = '' }:
		{ label?: string; prefix?: '' | 'billing_'; placeholder?: string; class?: string } = $props()
	const ctx = getAddressContext()
	const field = $derived(ctx.form.fields[`${prefix}address_1`])

	async function onselect(addr: NormalizedAddress) {
		await ctx.setAddressFromAutocomplete(addr, prefix)
		// Collapse the GPAC input to just the street line; city/province/postal/country moved to their fields.
		return addr.address_1
	}
	function oninput(text: string) {
		field.set(text)
		ctx.save()
	}
</script>

{#if ctx.isAutocomplete}
	<Field.Field>
		{#if label}<Field.FieldLabel>{label}</Field.FieldLabel>{/if}
		<GooglePlacesAutocomplete apiKey={ctx.googlePlacesApiKey!} {placeholder} initialValue={field.value()} {onselect} {oninput} class={className} />
	</Field.Field>
{:else}
	<InputText {field} {label} {placeholder} autocomplete="address-line1" onchange={ctx.onchange} class={className} />
{/if}
