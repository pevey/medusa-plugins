import { model } from '@medusajs/framework/utils'
import { WebhookAction } from './webhook-action'

export enum WebhookDeliveryStatus {
	PENDING = 'pending',
	SUCCESS = 'success',
	FAILED = 'failed'
}

export const WebhookDelivery = model.define('webhookDelivery', {
	id: model.id().primaryKey(),
	event_name: model.text(),
	request_payload: model.json().nullable(),
	response_status: model.number().nullable(),
	response_body: model.text().nullable(),
	status: model.enum(WebhookDeliveryStatus).default(WebhookDeliveryStatus.PENDING),
	attempts: model.number().default(0),
	error_message: model.text().nullable(),
	action: model.belongsTo(() => WebhookAction, { mappedBy: 'deliveries' })
})
