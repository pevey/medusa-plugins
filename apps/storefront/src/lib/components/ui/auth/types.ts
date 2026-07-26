import type { RemoteForm, RemoteFormField } from '@sveltejs/kit'

// Mirrors the SDK's AuthResult (auth.remote.ts). Codes vary by form.
export type AuthResult = { ok: boolean; code?: string }

export type AuthMessages = Record<string, string>

export type AuthForm = RemoteForm<any, AuthResult>

export type AuthFormContext = {
	readonly form: AuthForm
	readonly error: string
	readonly submitting: boolean
	readonly messages: AuthMessages
	switchMode?: (mode: string) => void
}
export type AuthFieldContext = {
	readonly field: RemoteFormField<any>
	readonly name: string
}
