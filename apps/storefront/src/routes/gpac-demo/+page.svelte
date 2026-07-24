<script lang="ts">
	import { GooglePlacesAutocomplete } from '$lib/components/ui/google-places-autocomplete'
	import { GOOGLE_PLACES_API_KEY } from '$app/env/public'
	import type { NormalizedAddress } from '$lib/components/ui/google-places-autocomplete'

	const key = GOOGLE_PLACES_API_KEY ?? ''
	let selected = $state<NormalizedAddress | null>(null)
</script>

<div class="mx-auto max-w-xl space-y-8 p-8">
	<h1 class="text-2xl font-bold">Google Places Autocomplete</h1>

	<section class="space-y-1">
		<span class="text-sm font-medium">Default (chrome stripped, shadcn-themed)</span>
		<GooglePlacesAutocomplete apiKey={key} onselect={(a) => { selected = a }} />
	</section>

	<section class="space-y-1">
		<span class="text-sm font-medium"
			>Icons kept (search + clear) — same height as default now</span
		>
		<GooglePlacesAutocomplete apiKey={key} icons={{ search: true, close: true }} />
	</section>

	<!-- Icons kept + tuned via --gpac-icon-size / --gpac-icon-gap -->
	<section
		class="space-y-1 [&_gmp-place-autocomplete]:[--gpac-icon-size:1.375rem] [&_gmp-place-autocomplete]:[--gpac-icon-gap:0.75rem]"
	>
		<span class="text-sm font-medium"
			>Icons kept, resized via --gpac-icon-size / --gpac-icon-gap</span
		>
		<GooglePlacesAutocomplete apiKey={key} icons={{ search: true, close: true }} />
	</section>

	<section class="space-y-1">
		<span class="text-sm font-medium">Custom host class</span>
		<GooglePlacesAutocomplete apiKey={key} class="border-2 border-primary" />
	</section>

	<!-- Overriding shadow internals with --gpac-* (documented escape hatch) -->
	<section class="space-y-1 [&_gmp-place-autocomplete]:[--gpac-input-height:3rem]">
		<span class="text-sm font-medium">Taller input via --gpac-input-height</span>
		<GooglePlacesAutocomplete apiKey={key} />
	</section>

	{#if selected}
		<pre class="rounded-md border bg-muted p-3 text-xs">{JSON.stringify(selected, null, 2)}</pre>
	{/if}
</div>
