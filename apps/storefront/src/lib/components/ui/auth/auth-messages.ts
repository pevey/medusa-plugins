import type { AuthMessages } from './types.js'

// Default, overridable error copy. Codes come from the SDK auth remotes' AuthResult.
export const loginMessages: AuthMessages = {
	invalid_credentials: 'Invalid email or password.',
	rate_limited: 'Too many attempts. Please wait a moment and try again.',
	unsupported: 'This account needs an extra sign-in step that is not supported yet.',
	unknown: 'Something went wrong. Please try again.'
}
export const registerMessages: AuthMessages = {
	email_exists: 'An account with that email already exists.',
	unsupported: 'This sign-up needs an extra step that is not supported yet.',
	unknown: 'Something went wrong. Please try again.'
}
export const resetMessages: AuthMessages = {
	unknown: 'Something went wrong. Please try again.'
}
export function resolveMessage(messages: AuthMessages, code: string | undefined): string {
	return (
		messages[code ?? 'unknown'] ?? messages.unknown ?? 'Something went wrong. Please try again.'
	)
}
