import { Module } from '@medusajs/framework/utils'
import { WebhookService } from './service'

export const WEBHOOK_MODULE = 'webhook'

export default Module(WEBHOOK_MODULE, {
	service: WebhookService
})

export * from './service'
