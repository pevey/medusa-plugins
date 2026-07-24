<script module lang="ts">
	import { setOptions } from '@googlemaps/js-api-loader'

	// Shared across all instances — the loader must be configured exactly once per page.
	let loaderConfigured = false
	function configureGpacLoader(apiKey: string) {
		if (loaderConfigured) return
		setOptions({ key: apiKey, v: 'weekly', libraries: ['places'] })
		loaderConfigured = true
	}
</script>

<script lang="ts">
	import { importLibrary } from '@googlemaps/js-api-loader'
	import { onMount, onDestroy } from 'svelte'
	import { mode } from 'mode-watcher'
	import { twMerge } from 'tailwind-merge'
	import { installGpacShadowStyling } from './shadow-dom'
	import { componentsToAddress } from './address'
	import type { GooglePlacesAutocompleteProps } from './types'

	let {
		apiKey,
		placeholder = 'Enter address',
		initialValue = '',
		icons = {},
		fields = ['addressComponents'],
		class: className = '',
		onselect,
		oninput
	}: GooglePlacesAutocompleteProps = $props()

	const DEFAULT_HOST_CLASS = 'block w-full rounded-md border border-input bg-transparent'
	const hostClass = $derived(twMerge(DEFAULT_HOST_CLASS, className))

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let ref = $state<any>(null)
	let placeholderEl: HTMLInputElement

	// color-scheme follows the active theme so the shadow-internal input renders light/dark.
	$effect(() => {
		if (ref) ref.style.colorScheme = mode.current ?? 'light'
	})

	onMount(async () => {
		installGpacShadowStyling() // install-before-create; guarded, so repeat calls are free
		configureGpacLoader(apiKey)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const places = (await importLibrary('places')) as any
		ref = new places.PlaceAutocompleteElement({ value: initialValue })
		ref.className = hostClass
		ref.placeholder = placeholder
		ref.setAttribute('data-gpac-search', String(icons.search ?? false))
		ref.setAttribute('data-gpac-close', String(icons.close ?? false))
		ref.setAttribute('data-gpac-location', String(icons.location ?? false))

		// Listeners on the host — no observer, no shadow-input hunting.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		ref.addEventListener('gmp-select', async (e: any) => {
			const place = e.placePrediction.toPlace()
			await place.fetchFields({ fields })
			const replacement = await onselect?.(componentsToAddress(place.addressComponents), place)
			// A returned string replaces the input value (Google leaves the full formatted address in
			// it; consumers collapse it to e.g. the street line). Shadow is patched open — reach the input.
			if (typeof replacement === 'string') {
				const input = (ref?.shadowRoot?.querySelector("input[part='input']") ??
					ref?.shadowRoot?.querySelector('input')) as HTMLInputElement | null
				if (input) input.value = replacement
			}
		})
		ref.addEventListener('input', (e: Event) => {
			const inner = e.composedPath()[0] as HTMLInputElement | undefined
			oninput?.(inner?.value ?? '')
		})

		placeholderEl.replaceWith(ref) // bind:this — NOT a shared id
	})

	onDestroy(() => ref?.remove())
</script>

<input bind:this={placeholderEl} type="text" {placeholder} class={hostClass} />

<!-- The host is inserted programmatically (outside this template), so scoped styles can't reach it.
     :global() emits unscoped CSS; matches shadcn focus-visible (border-ring + ring/50). -->
<style>
	:global(gmp-place-autocomplete:focus-within) {
		border-color: var(--ring) !important;
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent) !important;
	}
</style>
