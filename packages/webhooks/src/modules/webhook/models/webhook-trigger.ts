import { model } from '@medusajs/framework/utils'
import { WebhookAction } from './webhook-action'
import { WebhookReceipt } from './webhook-receipt'

export enum WebhookTriggerType {
	MEDUSA_EVENT = 'medusa_event',
	INCOMING_WEBHOOK = 'incoming_webhook'
}

export const WebhookTrigger = model
	.define('webhookTrigger', {
		id: model.id().primaryKey(),
		name: model.text(),
		description: model.text().nullable(),
		is_active: model.boolean().default(true),
		trigger_type: model.enum(WebhookTriggerType),
		trigger_events: model.json().nullable(),      // string[] — for medusa_event
		trigger_signing_key: model.text().nullable(), // HMAC-SHA256 secret — for incoming_webhook
		log_incoming: model.boolean().default(false), // log incoming payloads as WebhookReceipts
		metadata: model.json().nullable(),
		actions: model.hasMany(() => WebhookAction, { mappedBy: 'trigger' }),
		receipts: model.hasMany(() => WebhookReceipt, { mappedBy: 'trigger' })
	})
	.cascades({ delete: ['actions', 'receipts'] })
