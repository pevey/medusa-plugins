import type Medusa from '@pevey/medusa-sdk'

export interface CookieNames {
	session: string
	region: string
	country: string
	cart: string
}

export interface MedusaHandleConfig {
	baseUrl: string
	publishableKey: string
	globalHeaders?: Record<string, string>
	defaultRegionId?: string
	defaultCountryCode?: string
	backendSessionCookie?: string
	cookies?: Partial<CookieNames>
	transferCartOnLogin?: boolean
	debug?: boolean
}

export interface ResolvedConfig {
	baseUrl: string
	publishableKey: string
	globalHeaders: Record<string, string>
	defaultRegionId?: string
	defaultCountryCode?: string
	backendSessionCookie: string
	cookies: CookieNames
	transferCartOnLogin: boolean
	debug: boolean
}

export interface MedusaContext {
	client: Medusa
	region_id: string
	country_code: string
	headers(): Record<string, string>
}

/** Structured result for auth forms so consumers map codes to their own copy/i18n. */
export interface AuthResult {
	ok: boolean
	code?: string
}
