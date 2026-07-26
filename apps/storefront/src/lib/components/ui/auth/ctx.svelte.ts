import { getContext, setContext } from 'svelte'
import type { AuthFormContext, AuthFieldContext } from './types.js'

const FORM = Symbol('auth-form')
const FIELD = Symbol('auth-field')

export function setAuthFormContext(ctx: AuthFormContext) {
	setContext(FORM, ctx)
}
export function getAuthFormContext(): AuthFormContext {
	const ctx = getContext<AuthFormContext>(FORM)
	if (!ctx) throw new Error('Auth.* must be used within an Auth.*Form')
	return ctx
}
export function getAuthFormContextOptional(): AuthFormContext | null {
	return getContext<AuthFormContext>(FORM) ?? null
}
export function setAuthFieldContext(ctx: AuthFieldContext) {
	setContext(FIELD, ctx)
}
export function getAuthFieldContext(): AuthFieldContext {
	const ctx = getContext<AuthFieldContext>(FIELD)
	if (!ctx) throw new Error('Auth.Label/Input/Error must be used within <Auth.Field>')
	return ctx
}
export function getAuthFieldContextOptional(): AuthFieldContext | null {
	return getContext<AuthFieldContext>(FIELD) ?? null
}
