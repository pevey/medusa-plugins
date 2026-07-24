<script lang="ts">
	import { addressCompose } from '../data.remote'
	import { GOOGLE_PLACES_API_KEY } from '$app/env/public'
	import { Root, Email, FirstName, LastName, Autocomplete, Country, Province, PostalCode, City } from '$lib/components/ui/address/index.js'
	import { US_STATES, US_MILITARY, CA_PROVINCES } from '$lib/components/ui/input-province/index.js'

	// Extend the default config to add APO/FPO military codes to the US list — no component edits.
	const provinceConfig = {
		us: { label: 'State', options: [...US_STATES, ...US_MILITARY] },
		ca: { label: 'Province', options: CA_PROVINCES }
	}
</script>

<div class="mx-auto max-w-2xl space-y-4 p-8">
	<h1 class="text-2xl font-bold">Compose-your-own</h1>
	<p class="text-muted-foreground text-sm">
		Assemble the <code>Address.*</code> parts directly. Omitting <code>BillingToggle</code>/<code>Billing</code>
		yields a single-address form (billing mirrors shipping via Root's hidden default).
		<a class="underline" href="/address-demo">← back to preset</a>
	</p>
	<form {...addressCompose}>
		<Root form={addressCompose} googlePlacesApiKey={GOOGLE_PLACES_API_KEY} {provinceConfig}>
			<div class="grid gap-3">
				<Email /><FirstName /><LastName /><Autocomplete /><Country /><Province /><PostalCode /><City />
			</div>
		</Root>
		<button class="bg-primary text-primary-foreground mt-4 h-9 rounded-md px-4 text-sm font-medium">Save</button>
	</form>
</div>
