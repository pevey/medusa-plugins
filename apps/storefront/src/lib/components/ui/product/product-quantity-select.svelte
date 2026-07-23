<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { goto } from '$app/navigation'
	import { getProductContextOptional } from './ctx.svelte.js'
	import * as logic from './product-logic.js'
	import ChevronDown from '@lucide/svelte/icons/chevron-down'

	interface Props {
		minQuantity?: number
		stepQuantity?: number
		maxQuantity?: number
		value?: number
		navigate?: (href: string) => void
		class?: string
	}
	let {
		minQuantity = 1,
		stepQuantity = 1,
		maxQuantity = 10,
		value = $bindable(1),
		navigate = goto,
		class: className = ''
	}: Props = $props()

	const ctx = getProductContextOptional()

	// Inside Product.Root the quantity is URL-derived (ctx.quantity); standalone it's the bindable value.
	const current = $derived(ctx ? ctx.quantity : value)
	const variant = $derived(ctx?.selectedVariant ?? null)
	const options = $derived(logic.quantityRange(variant, { min: minQuantity, step: stepQuantity, max: maxQuantity }))
	const hi = $derived(logic.effectiveMax(variant, maxQuantity))
	const disabled = $derived(hi < minQuantity)
	const shown = $derived(logic.clampQuantity(current, minQuantity, Math.max(hi, minQuantity)))

	function onchange(e: Event) {
		const n = Number((e.currentTarget as HTMLSelectElement).value)
		if (ctx) navigate(ctx.buildQuantityHref(n))
		else value = n
	}

	// shadcn-trigger-like native <select> styling (from input-select): appearance-none + pr-8 for the
	// chevron; explicit [&>option] popover tokens so the OS popup is readable in dark mode.
	const selectClass =
		'border-input focus-visible:border-ring focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground h-9 w-full appearance-none rounded-md border bg-transparent px-3 py-1 pr-8 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
</script>

<div class="relative">
	<select
		data-quantity-select
		aria-label="Quantity"
		{disabled}
		value={String(shown)}
		{onchange}
		class={cn(selectClass, className)}
	>
		{#each options as n (n)}
			<option value={String(n)}>{n}</option>
		{/each}
	</select>
	<ChevronDown class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 opacity-50" />
</div>
