<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutContext } from './ctx.svelte.js'
	const ctx = getCheckoutContext()
	let { class: className = '' }: { class?: string } = $props()
	const message = $derived(
		typeof ctx.error === 'string'
			? ctx.error
			: ((ctx.error as { message?: string } | null)?.message ?? 'Something went wrong')
	)
</script>

{#if ctx.error}
	<div data-checkout-error class={cn('bg-destructive/10 text-destructive rounded-md p-3 text-sm', className)}>
		{message}
	</div>
{/if}
