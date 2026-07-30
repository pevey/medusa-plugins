<script lang="ts">
	import { addressCollapsed } from '../data.remote'
	import { GOOGLE_PLACES_API_KEY } from '$app/env/public'
	import { AddressFormCollapsed } from '$lib/components/ui/address/index.js'
	import { US_STATES, US_MILITARY, CA_PROVINCES } from '$lib/components/ui/input-province/index.js'

	const provinceConfig = {
		us: { label: 'State', options: [...US_STATES, ...US_MILITARY] },
		ca: { label: 'Province', options: CA_PROVINCES }
	}
</script>

<div class="mx-auto max-w-2xl space-y-4 p-8">
	<h1 class="text-2xl font-bold">Collapsed address (disclosure)</h1>
	<p class="text-sm text-muted-foreground">
		Type an address in the autocomplete, or let your browser autofill from the email field — the structured fields reveal so you can confirm and add an
		Apt/Suite. See also
		<a class="underline" href="/address-demo">the full layout →</a>
	</p>
	<form {...addressCollapsed}>
		<AddressFormCollapsed form={addressCollapsed} googlePlacesApiKey={GOOGLE_PLACES_API_KEY} {provinceConfig} />
	</form>
</div>
