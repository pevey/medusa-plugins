<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getProductContext } from './ctx.svelte.js'
	import type { StoreProductOption } from '@medusajs/types'

	let { option, class: className = '' }: { option: StoreProductOption; class?: string } = $props()
	const ctx = getProductContext()

	const base =
		'inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors'
</script>

<div class="flex flex-col gap-3">
	<h2 class="text-sm font-medium">{option.title}</h2>
	<div class={cn('flex flex-wrap gap-2', className)}>
		{#each option.values ?? [] as value (value.id)}
			{@const selected = ctx.isSelected(value.id)}
			{@const available = ctx.isAvailable(value.id)}
			{#if selected}
				<span
					data-value
					data-selected="true"
					aria-current="true"
					class={cn(base, 'border-primary text-foreground')}
				>
					{value.value}
				</span>
			{:else if available}
				<a
					data-value
					data-available="true"
					href={ctx.buildHref(ctx.resolveVariant(option.id, value.id))}
					class={cn(base, 'border-input bg-transparent hover:bg-accent')}
				>
					{value.value}
				</a>
			{:else}
				<span
					data-value
					data-available="false"
					aria-disabled="true"
					class={cn(base, 'border-input text-muted-foreground line-through opacity-50')}
				>
					{value.value}
				</span>
			{/if}
		{/each}
	</div>
</div>
