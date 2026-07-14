import type { MedusaHandleConfig, ResolvedConfig } from '../types'

export const DEFAULT_COOKIES = {
	session: 'sid',
	region: 'region',
	country: 'country',
	cart: 'cartid'
} as const

export function resolveConfig(config: MedusaHandleConfig): ResolvedConfig {
	if (!config.baseUrl) throw new Error('createMedusaHandle: baseUrl is required')
	if (!config.publishableKey) throw new Error('createMedusaHandle: publishableKey is required')
	return {
		baseUrl: config.baseUrl,
		publishableKey: config.publishableKey,
		globalHeaders: config.globalHeaders ?? {},
		defaultRegionId: config.defaultRegionId,
		defaultCountryCode: config.defaultCountryCode,
		backendSessionCookie: config.backendSessionCookie ?? 'connect.sid',
		cookies: {
			session: config.cookies?.session ?? DEFAULT_COOKIES.session,
			region: config.cookies?.region ?? DEFAULT_COOKIES.region,
			country: config.cookies?.country ?? DEFAULT_COOKIES.country,
			cart: config.cookies?.cart ?? DEFAULT_COOKIES.cart
		},
		transferCartOnLogin: config.transferCartOnLogin ?? true,
		debug: config.debug ?? false
	}
}
