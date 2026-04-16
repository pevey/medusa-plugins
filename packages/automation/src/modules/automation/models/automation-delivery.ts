import { model } from '@medusajs/framework/utils'
import { AutomationAction } from './automation-action'

export enum AutomationDeliveryStatus {
	PENDING = 'pending',
	SUCCESS = 'success',
	FAILED = 'failed'
}

export const AutomationDelivery = model.define('automationDelivery', {
	id: model.id().primaryKey(),
	event_name: model.text(),
	request_payload: model.json().nullable(),
	response_status: model.number().nullable(),
	response_body: model.text().nullable(),
	status: model.enum(AutomationDeliveryStatus).default(AutomationDeliveryStatus.PENDING),
	attempts: model.number().default(0),
	error_message: model.text().nullable(),
	action: model.belongsTo(() => AutomationAction, { mappedBy: 'deliveries' })
})
