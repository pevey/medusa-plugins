import { Client, Auth } from '@medusajs/js-sdk'
import type { Config } from '@medusajs/js-sdk'
import { Store } from './store'
import { Admin } from './admin'
import { Analytics } from './analytics'
import type { AnalyticsConfig } from './types/analytics'

export interface MedusaConfig extends Config {
	/** Analytics configuration (batching, flush interval, etc.) */
	analytics?: AnalyticsConfig
}

export default class Medusa {
	public client: Client
	public store: Store
	public admin: Admin
	public auth: Auth
	public analytics: Analytics

	constructor(config: MedusaConfig) {
		this.client = new Client(config)
		this.store = new Store(this.client)
		this.admin = new Admin(this.client)
		this.auth = new Auth(this.client, config)
		this.analytics = new Analytics(this.client, config.analytics)
	}

	setLocale(locale: string) {
		this.client.setLocale(locale)
	}

	getLocale() {
		return this.client.locale
	}
}

// Re-export types for consumers
export { Store } from './store'
export { Admin } from './admin'
export { Analytics } from './analytics'
export { Client, Auth, FetchError } from '@medusajs/js-sdk'
export type { Config, ClientHeaders, FetchArgs, FetchInput, FetchStreamResponse, Logger } from '@medusajs/js-sdk'
export * from './types'
