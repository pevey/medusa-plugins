export type TurnstileTheme = 'light' | 'dark' | 'auto'
export type TurnstileSize = 'normal' | 'flexible' | 'compact'
export type TurnstileRetry = 'auto' | 'never'
export type TurnstileRefresh = 'auto' | 'manual' | 'never'
export type TurnstileAppearance = 'always' | 'execute' | 'interaction-only'
export type TurnstileExecution = 'render' | 'execute'

/** The (kebab-case) object passed to `window.turnstile.render()` / `.execute()`. */
export interface TurnstileRenderParameters {
	sitekey: string
	action?: string
	cData?: string
	callback?: (token: string) => void
	'error-callback'?: (code: string) => void
	'expired-callback'?: () => void
	'timeout-callback'?: () => void
	'before-interactive-callback'?: () => void
	'after-interactive-callback'?: () => void
	'unsupported-callback'?: () => void
	theme?: TurnstileTheme
	language?: string
	tabindex?: number
	size?: TurnstileSize
	retry?: TurnstileRetry
	'retry-interval'?: number
	'refresh-expired'?: TurnstileRefresh
	'refresh-timeout'?: TurnstileRefresh
	appearance?: TurnstileAppearance
	execution?: TurnstileExecution
	'response-field'?: boolean
	'response-field-name'?: string
	'feedback-enabled'?: boolean
	'offlabel-show-privacy'?: boolean
	'offlabel-show-help'?: boolean
}

/** The global `window.turnstile` API. */
export interface TurnstileInstance {
	ready: (callback: () => void) => void
	render: (container: string | HTMLElement, params: TurnstileRenderParameters) => string
	execute: (container: string | HTMLElement, params?: TurnstileRenderParameters) => void
	reset: (widgetId?: string) => void
	remove: (widgetId?: string) => void
	getResponse: (widgetId?: string) => string | undefined
	isExpired: (widgetId?: string) => boolean
}

/** Imperative controls exposed by the `Turnstile` component via `bind:widget`. */
export interface TurnstileWidget {
	id: string
	execute: () => void
	reset: () => void
	getResponse: () => string | undefined
	isExpired: () => boolean
}

/** Options for the `getClearance()` pre-clearance helper. */
export interface GetClearanceOptions {
	action?: string
	cData?: string
	container?: HTMLElement
	appearance?: TurnstileAppearance
	theme?: TurnstileTheme
	language?: string
	size?: TurnstileSize
	execution?: TurnstileExecution
	timeoutMs?: number
}
