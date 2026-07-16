import { Client, Auth } from '@medusajs/js-sdk'
import type { Config } from '@medusajs/js-sdk'
import { Store } from './store'
import { Admin } from './admin'

export interface MedusaConfig extends Config {}

export default class Medusa {
	public client: Client
	public store: Store
	public admin: Admin
	public auth: Auth

	constructor(config: MedusaConfig) {
		this.client = new Client(config)
		this.store = new Store(this.client)
		this.admin = new Admin(this.client)
		this.auth = new Auth(this.client, config)
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
export { createAnalyticsCollector } from './analytics-collector'
export type { AnalyticsCollector } from './analytics-collector'
export { Client, Auth, FetchError } from '@medusajs/js-sdk'
export type { Config, ClientHeaders, FetchArgs, FetchInput, FetchStreamResponse, Logger } from '@medusajs/js-sdk'
export * from './types'
