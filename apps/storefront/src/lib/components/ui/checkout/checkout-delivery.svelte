<script lang="ts">
	import { onMount } from 'svelte'
	import { getShippingOptions } from 'sveltekit-medusa-sdk'
	import { cn } from '$lib/utils.js'
	import { getCheckoutContext } from './ctx.svelte.js'
	import { formatPrice } from './format-price.js'

	let { class: className = '' }: { class?: string } = $props()

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
			const stillValid = !!existing && options.some(o => o.id === existing)
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
				<!-- No `name`: this radio lives inside the checkout <form> (a SvelteKit RemoteForm) whose
				     input handler treats any NAMED input as a form field and throws on a non-field name
				     ("Invalid path checkout-shipping-option"). Selection is driven entirely by Svelte
				     `bind:group` (+ `onchange`), which needs no DOM name; `role="radiogroup"` on the wrapper
				     carries the group semantics. -->
				<!-- @tailwindcss/forms fills the checked radio with the text color + a white center dot, and
				     keeps a white control background. Theme tokens flip in dark mode (text-primary → near-
				     white → invisible on the white fill), so use FIXED neutrals: a consistent gray control
				     both modes. `focus:ring-0` removes the plugin's focus ring (selection is the indicator). -->
				<input
					type="radio"
					value={option.id}
					bind:group={selected}
					{onchange}
					class="size-4 border-gray-300 text-gray-700 focus:ring-0 focus:ring-offset-0"
				/>
				<span>{option.name}</span>
				<span class="ml-auto">{formatPrice(option.amount, ctx.cart?.currency_code ?? 'usd')}</span>
			</label>
		{:else}
			<p class="text-sm text-muted-foreground">No delivery options available</p>
		{/each}
	</div>
</section>
