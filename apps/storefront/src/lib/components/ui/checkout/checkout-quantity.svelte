<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import MinusIcon from '@lucide/svelte/icons/minus'
	import PlusIcon from '@lucide/svelte/icons/plus'
	import { getCheckoutContext, getCheckoutLineContext } from './ctx.svelte.js'

	let { min = 1, max = 9999, class: className = '' }: { min?: number; max?: number; class?: string } = $props()
	const ctx = getCheckoutContext()
	const { item } = getCheckoutLineContext()

	// Seeds from item.quantity and auto-resyncs when the server-confirmed quantity changes,
	// while still allowing local typing. Writable $derived — no $effect.
	let draft = $derived(String(item.quantity))
	const disabled = $derived(ctx.placing)

	function commit(raw: number) {
		if (!Number.isFinite(raw)) {
			draft = String(item.quantity)
			return
		}
		const next = Math.min(max, Math.max(min, Math.trunc(raw)))
		if (next === item.quantity) {
			draft = String(item.quantity)
			return
		}
		ctx.updateItem(item.id, next)
	}
	function commitDraft() {
		const parsed = parseInt(draft, 10)
		commit(Number.isNaN(parsed) ? Number.NaN : parsed)
	}
</script>

<div
	class={cn('inline-flex h-9 items-center rounded-full border border-input', className)}
	role="group"
	aria-label="Quantity stepper"
	data-checkout-quantity
>
	<Button
		variant="ghost"
		size="icon"
		class="size-8 rounded-full"
		disabled={disabled || item.quantity <= min}
		onclick={() => commit(item.quantity - 1)}
	>
		<MinusIcon /><span class="sr-only">Decrease quantity</span>
	</Button>
	<input
		type="text"
		inputmode="numeric"
		pattern="[0-9]*"
		maxlength="4"
		aria-label="Quantity"
		value={draft}
		{disabled}
		oninput={(e) => (draft = e.currentTarget.value.replace(/\D/g, '').slice(0, 4))}
		onblur={commitDraft}
		onkeydown={(e) => {
			if (e.key === 'Enter') e.currentTarget.blur()
		}}
		class="w-12 border-none bg-transparent text-center text-sm font-medium tabular-nums focus:outline-none focus:ring-0 disabled:opacity-50"
	/>
	<Button
		variant="ghost"
		size="icon"
		class="size-8 rounded-full"
		disabled={disabled || item.quantity >= max}
		onclick={() => commit(item.quantity + 1)}
	>
		<PlusIcon /><span class="sr-only">Increase quantity</span>
	</Button>
</div>
