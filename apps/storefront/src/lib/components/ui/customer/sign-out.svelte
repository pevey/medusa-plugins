<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { Button, type ButtonSize, type ButtonVariant } from '$lib/components/ui/button/index.js'
	import { logout } from 'sveltekit-medusa-sdk/auth'
	import { getCustomer } from 'sveltekit-medusa-sdk/customer'
	import type { Snippet } from 'svelte'

	let {
		onsignout,
		class: className = '',
		variant = 'default',
		size = 'default',
		children
	}: { onsignout?: () => void; class?: string; variant?: ButtonVariant; size?: ButtonSize; children?: Snippet } = $props()

	let pending = $state(false)

	async function handleClick() {
		if (pending) return
		pending = true
		try {
			await logout()
			await getCustomer().refresh()
			onsignout?.()
		} finally {
			pending = false
		}
	}
</script>

{#if children}
	<button type="button" data-customer-sign-out class={cn('inline-flex cursor-pointer items-center', className)} disabled={pending} onclick={handleClick}>
		{@render children()}
	</button>
{:else}
	<Button data-customer-sign-out {variant} {size} class={className} disabled={pending} onclick={handleClick}>Sign Out</Button>
{/if}
