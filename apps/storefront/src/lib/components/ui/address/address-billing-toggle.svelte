<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getAddressContext } from './ctx.svelte.js'
	let { label = 'Billing address is the same as shipping', class: className = '' }: { label?: string; class?: string } = $props()
	const ctx = getAddressContext()
</script>

<label class={cn('flex items-center gap-2 py-3 text-sm', className)}>
	<input
		type="checkbox"
		class="border-gray-300 text-gray-700 focus:ring-0 focus:ring-offset-0 size-4 rounded-sm border"
		checked={ctx.billingSameAsShipping}
		onchange={(e) => ctx.setBillingSameAsShipping(e.currentTarget.checked)}
	/>
	<span>{label}</span>
</label>
