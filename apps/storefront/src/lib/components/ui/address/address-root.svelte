<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte'
	import type { RemoteForm } from '@sveltejs/kit'
	import type { StoreCart } from '@medusajs/types'
	import {
		getCart as sdkGetCart,
		getRegions as sdkGetRegions,
		updateCart as sdkUpdateCart,
		regionForCountry,
		countriesFromRegions
	} from 'sveltekit-medusa-sdk'
	import { cn } from '$lib/utils.js'
	import { setAddressContext, getAddressHostOptional } from './ctx.svelte.js'
	import { buildUpdatePayload, resolveCountryValue, ADDRESS_KEYS } from './address-logic.js'
	import {
		defaultProvinceConfig,
		resolveProvinceValue,
		type ProvinceConfig
	} from '../input-province/provinces'
	import type { GetCartFn, GetRegionsFn, UpdateCartFn, UpdateCartArgs } from './types.js'
	import type { NormalizedAddress } from '../google-places-autocomplete/types'

	interface Props {
		form: RemoteForm<any, any>
		googlePlacesApiKey?: string
		provinceConfig?: ProvinceConfig
		getCart?: GetCartFn
		getRegions?: GetRegionsFn
		updateCart?: UpdateCartFn
		debounceMs?: number
		/** When true, offer only the current region's countries and never switch region from the address
		 *  (pinned-region checkout). Default false = full shippable set + self-correcting region switch. */
		restrictToCurrentRegion?: boolean
		onaddresschange?: (cart: StoreCart) => void
		onregionchange?: (regionId: string, country: string) => void
		onerror?: (err: unknown) => void
		class?: string
		children: Snippet
	}
	let {
		form,
		googlePlacesApiKey,
		provinceConfig = defaultProvinceConfig,
		getCart = sdkGetCart as unknown as GetCartFn,
		getRegions = sdkGetRegions as unknown as GetRegionsFn,
		updateCart = sdkUpdateCart as unknown as UpdateCartFn,
		debounceMs = 200,
		restrictToCurrentRegion = false,
		onaddresschange,
		onregionchange,
		onerror,
		class: className = '',
		children
	}: Props = $props()

	// Call the remotes once; read `.current` reactively (no $effect).
	const cartQuery = untrack(() => getCart())
	const regionsRes = untrack(() => getRegions())
	const wait = untrack(() => debounceMs)

	// Read the optional host context ONCE during init (not in onMount — getContext must run while the
	// component is initialising). A wrapping Checkout.Root fills this; standalone Address leaves it null.
	const addressHost = getAddressHostOptional()

	// Notify the public callback AND the optional host of every committed cart change, so a host like
	// Checkout.Root can re-fetch shipping options (which depend on the shipping address/region).
	function notifyChange(cart: StoreCart) {
		onaddresschange?.(cart)
		addressHost?.onAddressChange?.(cart)
	}
	// Surface a cart-update failure to the public callback AND the host (Checkout.Root), so it isn't
	// swallowed — e.g. a region switch rejected because a cart product has no price for the new region.
	function notifyError(err: unknown) {
		onerror?.(err)
		addressHost?.onError?.(err)
	}

	// Guards against a debounced `rawSave` firing mid-`updateAddress()` and racing its own updateCart.
	let committing = false

	let billingSameAsShipping = $state(true)
	const showBilling = $derived(!billingSameAsShipping)
	let expanded = $state(false)
	let rootEl: HTMLElement

	const get = (name: string) => form.fields[name]?.value() ?? ''
	// The selectable delivery countries. `restrictToCurrentRegion` narrows to the cart's current region
	// (pinned-region checkout); otherwise the full shippable set across all regions (self-correcting).
	const countries = () => {
		const regions = regionsRes.current ?? []
		if (!restrictToCurrentRegion) return countriesFromRegions(regions)
		const current = regions.find((r) => r.id === cartQuery.current?.region_id)
		return countriesFromRegions(current ? [current] : regions)
	}

	// Fields whose fill (autofill/manual) reveals the collapsed structured block.
	const STRUCTURED = [
		'address_1',
		'address_2',
		'city',
		'province',
		'postal_code',
		'country_code',
		'phone'
	]
	const isStructured = (name: string) => STRUCTURED.includes(name.replace(/^billing_/, ''))

	// ---- hand-rolled cancelable/awaitable debounce (replaces p-debounce so updateAddress() can flush) ----
	let timer: ReturnType<typeof setTimeout> | undefined
	let pending: Promise<void> | null = null
	let resolvePending: (() => void) | null = null
	function save(): Promise<void> {
		if (!pending) pending = new Promise(r => (resolvePending = r))
		if (timer) clearTimeout(timer)
		timer = setTimeout(runSave, wait)
		return pending
	}
	async function runSave() {
		timer = undefined
		const done = resolvePending
		pending = null
		resolvePending = null
		await rawSave()
		done?.()
	}
	function cancelSave() {
		if (timer) clearTimeout(timer)
		timer = undefined
		const done = resolvePending
		pending = null
		resolvePending = null
		done?.()
	}

	// ---- normalize province/country display-names → codes, for both shipping and billing ----
	function normalizeCodes() {
		const list = countries()
		for (const prefix of ['', 'billing_']) {
			const country = form.fields[`${prefix}country_code`]?.value() ?? ''
			const prov = form.fields[`${prefix}province`]?.value() ?? ''
			// Resolve country to its code first; the province lookup is keyed by that code (not a
			// display name), so a raw autofill value like "United States" must be normalized before use.
			const resolvedCountry = country ? resolveCountryValue(list, country) : country
			if (country) form.fields[`${prefix}country_code`]?.set(resolvedCountry)
			if (prov)
				form.fields[`${prefix}province`]?.set(
					resolveProvinceValue(provinceConfig, resolvedCountry, prov)
				)
		}
	}

	// ---- read live DOM values within Root's subtree into the form fields (catches silent fills) ----
	function reconcileFromDom() {
		if (rootEl) {
			const controls = rootEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
				'input[name], select[name]'
			)
			for (const el of controls) {
				if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio'))
					continue
				const f = form.fields[el.name]
				if (f && f.value() !== el.value) f.set(el.value)
			}
		}
		normalizeCodes()
	}

	// Build the update payload WITH the region_id for the chosen country, so region + address commit
	// atomically. Medusa validates the shipping country against the payload's region (the NEW region
	// when region_id is present), so bundling region_id avoids "Country X is not within region Y" when
	// the selected country belongs to a different region than the cart's current one. Skipped under
	// `restrictToCurrentRegion` (region is pinned).
	function payloadWithRegion(): UpdateCartArgs {
		const payload = buildUpdatePayload(get, showBilling)
		if (!restrictToCurrentRegion) {
			const region = regionForCountry(regionsRes.current ?? [], get('country_code'))
			if (region) payload.region_id = region.id
		}
		return payload
	}

	const rawSave = async () => {
		if (committing) return
		try {
			const updated = await updateCart(payloadWithRegion())
			if (updated) notifyChange(updated)
		} catch (e) {
			notifyError(e)
		}
	}
	async function reconcileAndSave() {
		reconcileFromDom()
		await save()
	}
	async function updateAddress(): Promise<StoreCart | null> {
		committing = true
		cancelSave()
		reconcileFromDom()
		try {
			// payloadWithRegion() carries region_id for the chosen country, so region + address commit
			// atomically — this also covers a browser autofill that only fired `input` (not `change`).
			const updated = await updateCart(payloadWithRegion())
			if (updated) notifyChange(updated)
			return updated
		} catch (e) {
			notifyError(e)
			return null
		} finally {
			committing = false
		}
	}

	function setExpanded(v: boolean) {
		expanded = v
	}

	async function setRegionForCountry(code: string) {
		// Pinned-region checkout: never switch region from the address — this also clamps a browser
		// autofill that injects an out-of-region country (which the country list wouldn't even offer).
		if (restrictToCurrentRegion) return
		const regions = regionsRes.current ?? (await regionsRes)
		const region = regionForCountry(regions, code)
		if (!region || cartQuery.current?.region_id === region.id) return
		try {
			const updated = await updateCart({
				region_id: region.id,
				shipping_address: { country_code: code } as any
			})
			if (updated) {
				onregionchange?.(region.id, code)
				notifyChange(updated)
			}
		} catch (e) {
			notifyError(e)
		}
	}

	async function onchange(event: Event) {
		const t = event.target as HTMLInputElement | HTMLSelectElement
		if (t?.name === 'country_code') await setRegionForCountry(t.value)
		if (t?.name && isStructured(t.name)) expanded = true
		await reconcileAndSave()
	}
	// Delegated input capture (bubbles from any field): reveals the structured block promptly and
	// keeps the region in sync with a country autofill that only fires `input` (not `change`).
	// Reveal-only — it must NOT save. Saving stays on `change` (onchange → reconcileAndSave) so the
	// full AddressForm layout keeps its save-on-blur cadence instead of a save per keystroke/input.
	function ondelegatedinput(event: Event) {
		const t = event.target as HTMLInputElement | null
		if (!t?.name || !form.fields[t.name]) return
		if (t.name === 'country_code') setRegionForCountry(t.value)
		if (isStructured(t.name)) expanded = true
	}

	function setBillingSameAsShipping(same: boolean) {
		billingSameAsShipping = same
		form.fields.hideBilling?.set(same)
		if (same) {
			for (const k of ADDRESS_KEYS) form.fields[`billing_${k}`]?.set('')
			updateCart({ billing_address: {} })
				.then(u => u && notifyChange(u))
				.catch(e => notifyError(e))
		}
	}

	async function setAddressFromAutocomplete(addr: NormalizedAddress, prefix = '') {
		const set = (n: string, val: string) => form.fields[prefix + n]?.set(val)
		set('address_1', addr.address_1)
		set('address_2', addr.address_2)
		set('city', addr.city)
		set('province', resolveProvinceValue(provinceConfig, addr.country_code, addr.province))
		set('postal_code', addr.postal_code.toUpperCase())
		set('country_code', addr.country_code)
		expanded = true
		if (!prefix) await setRegionForCountry(addr.country_code)
		await save()
	}

	/**
	 * Populate the form from Stripe's AddressElement value (name + address + phone), then reconcile the
	 * region and commit — the Elements-mode analog of `setAddressFromAutocomplete`. Stripe returns the
	 * country as an uppercase ISO-2 (`AU`); Medusa uses lowercase. `firstName`/`lastName` are present
	 * when the element uses `display: { name: 'split' }`, else we split the combined `name`.
	 */
	async function setAddressFromStripe(value: any) {
		const a = value?.address ?? {}
		const country = String(a.country ?? '').toLowerCase()
		const first = value?.firstName ?? String(value?.name ?? '').split(' ')[0] ?? ''
		const last = value?.lastName ?? String(value?.name ?? '').split(' ').slice(1).join(' ')
		const set = (n: string, val: string) => form.fields[n]?.set(val ?? '')
		set('first_name', first)
		set('last_name', last)
		set('address_1', a.line1 ?? '')
		set('address_2', a.line2 ?? '')
		set('city', a.city ?? '')
		set('province', resolveProvinceValue(provinceConfig, country, a.state ?? ''))
		set('postal_code', a.postal_code ?? '')
		set('country_code', country)
		if (value?.phone) set('phone', value.phone)
		expanded = true
		await setRegionForCountry(country)
		await save()
	}

	setAddressContext({
		get form() {
			return form
		},
		get cart() {
			return cartQuery.current
		},
		get regions() {
			return regionsRes.current
		},
		get countries() {
			return countries()
		},
		get provinceConfig() {
			return provinceConfig
		},
		get googlePlacesApiKey() {
			return googlePlacesApiKey
		},
		get isAutocomplete() {
			return !!googlePlacesApiKey
		},
		get billingSameAsShipping() {
			return billingSameAsShipping
		},
		get showBilling() {
			return showBilling
		},
		get expanded() {
			return expanded
		},
		setExpanded,
		updateAddress,
		onchange,
		save,
		setRegionForCountry,
		setBillingSameAsShipping,
		setAddressFromAutocomplete,
		setAddressFromStripe
	})

	onMount(() => {
		addressHost?.registerUpdateAddress?.(updateAddress)
		// Expand by default when the user asked to skip motion/choreography (a11y).
		if (
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
		) {
			expanded = true
		}
		const c = cartQuery.current
		if (c) {
			form.fields.email?.set(c.email ?? '')
			const s = c.shipping_address ?? {}
			for (const k of ADDRESS_KEYS) form.fields[k]?.set((s as any)[k] ?? '')
			form.fields.province?.set(
				resolveProvinceValue(
					provinceConfig,
					(s as any)?.country_code,
					(s as any)?.province ?? ''
				)
			)
			const b = c.billing_address
			if (b && Object.entries(b).some(([k, v]) => k !== 'id' && !!v))
				billingSameAsShipping = false
			for (const k of ADDRESS_KEYS) form.fields[`billing_${k}`]?.set((b as any)?.[k] ?? '')
			form.fields.billing_province?.set(
				resolveProvinceValue(
					provinceConfig,
					(b as any)?.country_code,
					(b as any)?.province ?? ''
				)
			)
			form.fields.hideBilling?.set(billingSameAsShipping)
			// A hydrated cart already has an address → show the structured fields.
			if ((s as any)?.address_1 || (s as any)?.city) expanded = true
		}
	})
</script>

<div bind:this={rootEl} class={cn('', className)} oninput={ondelegatedinput}>
	{#if form.fields?.hideBilling}
		<input
			class="hidden"
			aria-hidden="true"
			tabindex="-1"
			{...form.fields.hideBilling.as('checkbox', true)}
		/>
	{/if}
	{@render children()}
</div>
