import type { RemoteForm, RemoteFormInput } from '@sveltejs/kit'
import { setAuthFormContext } from './ctx.svelte.js'
import { resolveMessage } from './auth-messages.js'
import type { AuthForm, AuthMessages, AuthResult } from './types.js'

export interface CreateAuthFormOptions<Input extends RemoteFormInput | void> {
	/** The SDK remote form this component drives (e.g. `login`, `register`). */
	form: RemoteForm<Input, AuthResult>
	/** Default + overridable error copy, keyed by the result `code`. */
	messages: AuthMessages
	/** Runs on a successful (ok) result before `onsuccess` — e.g. `() => getCustomer().refresh()`. */
	onOk?: () => void | Promise<void>
	onsuccess?: () => void
	onswitch?: (mode: string) => void
	onerror?: (result: AuthResult) => void
}

/**
 * Shared wiring for the `Auth.*Form` roots: provides the form context the field/submit parts read,
 * runs the native remote-form submission, maps failure codes to copy, and exposes the enhanced
 * `<form>` attributes. Call it once from a form component's top-level script (component-init scope,
 * so the context is set correctly). Pass a thunk so prop reads stay reactive.
 */
export function createAuthForm<Input extends RemoteFormInput | void>(
	options: () => CreateAuthFormOptions<Input>
) {
	let error = $state('')

	setAuthFormContext({
		// SvelteKit types RemoteForm invariantly in its input shape; this single bridge cast lets any
		// concrete form live in the shared, form-agnostic context the field parts read.
		get form() {
			return options().form as unknown as AuthForm
		},
		get error() {
			return error
		},
		get submitting() {
			return options().form.pending > 0
		},
		get messages() {
			return options().messages
		},
		switchMode: (m) => options().onswitch?.(m)
	})

	const enhanced = options().form.enhance(async ({ submit }) => {
		error = ''
		await submit()
		const o = options()
		const r = o.form.result
		if (r?.ok) {
			await o.onOk?.()
			o.onsuccess?.()
		} else if (r) {
			error = resolveMessage(o.messages, r.code)
			o.onerror?.(r)
		}
	})

	return {
		/** Spread onto the `<form>` element. */
		get enhanced() {
			return enhanced
		},
		/** Clear the form-level error (wire to the form's `oninput`). */
		clearError() {
			error = ''
		}
	}
}
