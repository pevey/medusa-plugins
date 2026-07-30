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
 * Shared code for the `Auth.*Form` roots: provides the form context the field/submit parts read,
 * runs the native remote-form submission, maps failure codes to copy, and exposes the enhanced
 * `<form>` attributes. Call it once from a form component's top-level script (component-init scope,
 * so the context is set correctly).
 */
export function createAuthForm<Input extends RemoteFormInput | void>(options: () => CreateAuthFormOptions<Input>) {
	let error = $state('')

	setAuthFormContext({
		// SvelteKit types RemoteForm invariantly in its input shape; this single bridge cast lets any concrete form live in the shared, form-agnostic context the field parts read.
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
		switchMode: m => options().onswitch?.(m)
	})

	const enhanced = options().form.enhance(async ({ submit }) => {
		error = ''
		const o = options()
		try {
			await submit()
		} catch {
			// A thrown submission produced no AuthResult — a transport-level failure (offline, server unreachable, dropped connection). Surface it as in-form copy instead of letting it bubble up unhandled (which renders outside the form).
			const result: AuthResult = { ok: false, code: 'network' }
			error = resolveMessage(o.messages, result.code)
			o.onerror?.(result)
			return
		}
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
