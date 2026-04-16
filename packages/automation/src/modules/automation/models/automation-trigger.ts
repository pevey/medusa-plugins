import { model } from '@medusajs/framework/utils'
import { AutomationAction } from './automation-action'
import { AutomationReceipt } from './automation-receipt'

export enum AutomationTriggerType {
	MEDUSA_EVENT = 'medusa_event',
	INCOMING_WEBHOOK = 'incoming_webhook'
}

export const AutomationTrigger = model
	.define('automationTrigger', {
		id: model.id().primaryKey(),
		name: model.text(),
		description: model.text().nullable(),
		is_active: model.boolean().default(true),
		trigger_type: model.enum(AutomationTriggerType),
		trigger_events: model.json().nullable(),      // string[] — for medusa_event
		trigger_signing_key: model.text().nullable(), // HMAC-SHA256 secret — for incoming_webhook
		log_incoming: model.boolean().default(false), // log incoming payloads as AutomationReceipts
		metadata: model.json().nullable(),
		actions: model.hasMany(() => AutomationAction, { mappedBy: 'trigger' }),
		receipts: model.hasMany(() => AutomationReceipt, { mappedBy: 'trigger' })
	})
	.cascades({ delete: ['actions', 'receipts'] })
