<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutContext } from './ctx.svelte.js'
	let { class: className = '', placeholder = 'Discount code' }: { class?: string; placeholder?: string } = $props()
	const ctx = getCheckoutContext()
	let code = $state('')
	const promotions = $derived(ctx.cart?.promotions ?? [])
	async function apply() {
		const c = code.trim().toLowerCase()
		if (!c || promotions.some((p: any) => p.code === c)) { code = ''; return }
		await ctx.applyDiscount(c)
		code = ''
	}
</script>
<section data-checkout-discount class={cn('', className)}>
	<div class="flex gap-2">
		<input type="text" bind:value={code} {placeholder} class="border-input h-9 w-full rounded-md border bg-transparent px-2.5 text-sm" onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), apply())} />
		<button type="button" disabled={ctx.placing} onclick={apply} class="bg-secondary text-secondary-foreground h-9 rounded-md px-3 text-sm">Redeem</button>
	</div>
	{#if promotions.length}
		<div class="mt-2 flex flex-wrap gap-1">
			{#each promotions as p (p.id ?? p.code)}
				<span class="bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
					{(p as any).code}
					<button type="button" aria-label={`Remove ${(p as any).code}`} onclick={() => ctx.removeDiscount((p as any).code)}>×</button>
				</span>
			{/each}
		</div>
	{/if}
</section>
