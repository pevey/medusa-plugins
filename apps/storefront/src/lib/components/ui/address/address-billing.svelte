<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getAddressContext } from './ctx.svelte.js'
	import FirstName from './address-first-name.svelte'
	import LastName from './address-last-name.svelte'
	import Autocomplete from './address-autocomplete.svelte'
	import Line2 from './address-line2.svelte'
	import Country from './address-country.svelte'
	import Province from './address-province.svelte'
	import PostalCode from './address-postal-code.svelte'
	import City from './address-city.svelte'
	import Phone from './address-phone.svelte'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getAddressContext()
</script>

{#if ctx.showBilling}
	<div class={cn('grid grid-cols-2 gap-x-2', className)}>
		<div class="col-span-2 md:col-span-1"><FirstName prefix="billing_" /></div>
		<div class="col-span-2 md:col-span-1"><LastName prefix="billing_" /></div>
		<div class="col-span-2"><Autocomplete prefix="billing_" /></div>
		<div class="col-span-2"><Line2 prefix="billing_" /></div>
		<div class="col-span-2 md:col-span-1"><Country prefix="billing_" /></div>
		<div class="col-span-2 md:col-span-1"><Province prefix="billing_" /></div>
		<div class="col-span-2 md:col-span-1"><PostalCode prefix="billing_" /></div>
		<div class="col-span-2 md:col-span-1"><City prefix="billing_" /></div>
		<div class="col-span-2"><Phone prefix="billing_" /></div>
	</div>
{/if}
