<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js'
	import { logout } from 'sveltekit-medusa-sdk/auth'
	import { getCustomer } from 'sveltekit-medusa-sdk/customer'
	import type { Snippet } from 'svelte'

	let { onsignout, class: className = '', children }: { onsignout?: () => void; class?: string; children?: Snippet } = $props()

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

<Button class={className} disabled={pending} onclick={handleClick}>
	{#if children}{@render children()}{:else}Sign out{/if}
</Button>
