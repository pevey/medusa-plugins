<script lang="ts">
	import type { Snippet } from 'svelte'
	import { register } from 'sveltekit-medusa-sdk/auth'
	import { getCustomer } from 'sveltekit-medusa-sdk/customer'
	import { cn } from '$lib/utils.js'
	import { createAuthForm } from './create-auth-form.svelte.js'
	import { registerMessages } from './auth-messages.js'
	import type { AuthMessages, AuthResult } from './types.js'

	let {
		messages = registerMessages,
		onsuccess,
		onswitch,
		onerror,
		class: className = '',
		children
	}: {
		messages?: AuthMessages
		onsuccess?: () => void
		onswitch?: (mode: string) => void
		onerror?: (result: AuthResult) => void
		class?: string
		children: Snippet
	} = $props()

	const auth = createAuthForm(() => ({
		form: register,
		messages,
		onOk: () => getCustomer().refresh(),
		onsuccess,
		onswitch,
		onerror
	}))
</script>

<form {...auth.enhanced} oninput={auth.clearError} class={cn('flex flex-col gap-4', className)}>
	{@render children()}
</form>
