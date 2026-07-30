<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getCheckoutContext } from './ctx.svelte.js'
	const ctx = getCheckoutContext()
	let { class: className = '' }: { class?: string } = $props()
	const message = $derived(typeof ctx.error === 'string' ? ctx.error : ((ctx.error as { message?: string } | null)?.message ?? 'Something went wrong'))
</script>

{#if ctx.error}
	<div data-checkout-error class={cn('rounded-md bg-destructive/10 p-3 text-sm text-destructive', className)}>
		{message}
	</div>
{/if}
