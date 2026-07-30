import Medusa from '@medusajs/js-sdk'

export const backendUrl =
	(typeof window !== 'undefined' && (window as any).__MEDUSA_ADMIN__?.backendUrl) || (import.meta as any).env?.VITE_MEDUSA_BACKEND_URL || '/'

export const sdk = new Medusa({
	baseUrl: backendUrl,
	auth: { type: 'session' }
})
