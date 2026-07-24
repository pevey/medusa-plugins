<script lang="ts">
	import { onMount } from 'svelte'
	import { getShippingOptions as sdkGetShippingOptions } from 'sveltekit-medusa-sdk'
	import { cn } from '$lib/utils.js'
	import { getCheckoutContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'
	import type { GetShippingOptionsFn } from './types.js'

	let {
		class: className = '',
		getShippingOptions = sdkGetShippingOptions as unknown as GetShippingOptionsFn
	}: { class?: string; getShippingOptions?: GetShippingOptionsFn } = $props()

	const ctx = getCheckoutContext()

	let options = $state<any[]>([])
	let selected = $state('')

	async function onchange() {
		if (selected) await ctx.selectShipping(selected)
	}

	// Fetch (or re-fetch) shipping options. Medusa's options depend on the cart's shipping address, so
	// the first mount — before any address is entered — returns nothing; Checkout.Root calls this again
	// through the address-host seam once the address/region is set. Keep a still-valid selection;
	// otherwise fall back to the first option and select it.
	async function loadOptions() {
		try {
			options = await getShippingOptions()
			const existing = ctx.cart?.shipping_methods?.[0]?.shipping_option_id as string | undefined
			const stillValid = !!existing && options.some((o) => o.id === existing)
			selected = (stillValid ? existing : options[0]?.id) ?? ''
			if (selected && selected !== existing) await ctx.selectShipping(selected)
		} catch {
			options = []
		}
	}

	onMount(() => {
		ctx.registerShippingRefresh(loadOptions)
		loadOptions()
	})
</script>

<section data-checkout-delivery class={cn('', className)}>
	<div role="radiogroup">
		{#each options as option (option.id)}
			<label class="flex items-center gap-2 py-1 text-sm">
				<input type="radio" name="checkout-shipping-option" value={option.id} bind:group={selected} {onchange} />
				<span>{option.name}</span>
				<span class="ml-auto">{formatPrice(option.amount, ctx.cart?.currency_code ?? 'usd')}</span>
			</label>
		{:else}
			<p class="text-sm text-muted-foreground">No delivery options available</p>
		{/each}
	</div>
</section>
