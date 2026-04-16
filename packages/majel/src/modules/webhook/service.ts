import { MedusaService } from '@medusajs/framework/utils'
import { WebhookTrigger } from './models/webhook-trigger'
import { WebhookAction } from './models/webhook-action'
import { WebhookDelivery } from './models/webhook-delivery'
import { WebhookReceipt } from './models/webhook-receipt'
import { WebhookQuery } from './models/webhook-query'
import { WebhookSecret } from './models/webhook-secret'
import { WebhookOptions } from './types'

export class WebhookService extends MedusaService({ WebhookTrigger, WebhookAction, WebhookDelivery, WebhookReceipt, WebhookQuery, WebhookSecret }) {
	protected readonly options_: WebhookOptions

	constructor(_container: object, options: Record<string, any> = {}) {
		super(...arguments)
		this.options_ = (options.webhooks ?? {}) as WebhookOptions
	}

	getOptions(): WebhookOptions {
		return this.options_
	}
}
