<script lang="ts">
	import type { Snippet } from 'svelte'
	import { resetPassword } from 'sveltekit-medusa-sdk/auth'
	import { cn } from '$lib/utils.js'
	import { createAuthForm } from './create-auth-form.svelte.js'
	import { resetMessages } from './auth-messages.js'
	import type { AuthMessages, AuthResult } from './types.js'

	let {
		messages = resetMessages,
		token = '',
		onsuccess,
		onswitch,
		onerror,
		class: className = '',
		children
	}: {
		messages?: AuthMessages
		token?: string
		onsuccess?: () => void
		onswitch?: (mode: string) => void
		onerror?: (result: AuthResult) => void
		class?: string
		children: Snippet
	} = $props()

	const auth = createAuthForm(() => ({
		form: resetPassword,
		messages,
		onsuccess,
		onswitch,
		onerror
	}))
</script>

<form {...auth.enhanced} oninput={auth.clearError} class={cn('flex flex-col gap-4', className)}>
	<!-- The reset token comes from the URL, not user input. Post it as a hidden field under the
	     form's own field name; native form submission sends DOM values, so no field-state seeding
	     is needed and `value` stays a plain reactive binding (SSR-safe, no effect/derived). -->
	<input type="hidden" name={resetPassword.fields.token?.as('text').name} value={token} />
	{@render children()}
</form>
