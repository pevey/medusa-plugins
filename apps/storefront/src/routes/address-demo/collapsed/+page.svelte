<script lang="ts">
	import { addressCollapsed } from '../data.remote'
	import { GOOGLE_PLACES_API_KEY } from '$app/env/public'
	import { AddressFormCollapsed } from '$lib/components/ui/address/index.js'
	import { US_STATES, US_MILITARY, CA_PROVINCES } from '$lib/components/ui/input-province/index.js'
	import type { StoreCart } from '@medusajs/types'

	const provinceConfig = {
		us: { label: 'State', options: [...US_STATES, ...US_MILITARY] },
		ca: { label: 'Province', options: CA_PROVINCES }
	}
	let commit: (() => Promise<StoreCart | null>) | undefined = $state()
</script>

<div class="mx-auto max-w-2xl space-y-4 p-8">
	<h1 class="text-2xl font-bold">Collapsed address (disclosure)</h1>
	<p class="text-muted-foreground text-sm">
		Type an address in the autocomplete, or let your browser autofill from the email field — the
		structured fields reveal so you can confirm and add an Apt/Suite. See also
		<a class="underline" href="/address-demo">the full layout →</a>
	</p>
	<form {...addressCollapsed}>
		<AddressFormCollapsed form={addressCollapsed} apiKey={GOOGLE_PLACES_API_KEY} {provinceConfig} registerCommit={(fn) => (commit = fn)} />
		<button
			type="button"
			class="bg-primary text-primary-foreground mt-4 h-9 rounded-md px-4 text-sm font-medium"
			onclick={() => commit?.()}
		>Commit (snapshot to cart)</button>
	</form>
</div>
