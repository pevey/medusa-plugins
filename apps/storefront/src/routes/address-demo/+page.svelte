<script lang="ts">
	import { address } from './data.remote'
	import { GOOGLE_PLACES_API_KEY } from '$app/env/public'
	import { AddressForm } from '$lib/components/ui/address/index.js'
	import { US_STATES, US_MILITARY, CA_PROVINCES } from '$lib/components/ui/input-province/index.js'

	// Extend the default config to add APO/FPO military codes to the US list — no component edits.
	const provinceConfig = {
		us: { label: 'State', options: [...US_STATES, ...US_MILITARY] },
		ca: { label: 'Province', options: CA_PROVINCES }
	}
</script>

<div class="mx-auto max-w-2xl space-y-4 p-8">
	<h1 class="text-2xl font-bold">Address form (preset)</h1>
	<p class="text-muted-foreground text-sm">
		The batteries-included <code>AddressForm</code> preset. See also
		<a class="underline" href="/address-demo/compose">compose-your-own →</a>
	</p>
	<form {...address}>
		<AddressForm form={address} apiKey={GOOGLE_PLACES_API_KEY} {provinceConfig} />
		<button class="bg-primary text-primary-foreground mt-4 h-9 rounded-md px-4 text-sm font-medium">Save</button>
	</form>
</div>
