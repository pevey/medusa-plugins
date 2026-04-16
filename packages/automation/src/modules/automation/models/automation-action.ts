import { model } from '@medusajs/framework/utils'
import { AutomationTrigger } from './automation-trigger'
import { AutomationDelivery } from './automation-delivery'
import { AutomationQuery } from './automation-query'

export enum AutomationActionType {
	OUTGOING_WEBHOOK = 'outgoing_webhook',
	OUTGOING_REQUEST = 'outgoing_request',
	MEDUSA_WORKFLOW = 'medusa_workflow'
}

export enum AutomationRequestMethod {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE'
}

export type FieldMapping = {
	source_path: string
	target_key: string
}

export type TargetHeader = {
	key: string
	value: string
}

export type StaticValue = {
	key: string
	value: string
}

export const AutomationAction = model
	.define('automationAction', {
		id: model.id().primaryKey(),
		name: model.text(),
		description: model.text().nullable(),
		is_active: model.boolean().default(true),
		trigger: model.belongsTo(() => AutomationTrigger, { mappedBy: 'actions' }),
		action_type: model.enum(AutomationActionType),
		target_url: model.text().nullable(),
		signing_secret_id: model.text().nullable(), // FK to automation_secret — outgoing_webhook only
		request_method: model.text().nullable(),    // AutomationRequestMethod — outgoing_request only
		target_headers: model.json().nullable(),  // TargetHeader[]
		medusa_workflow: model.text().nullable(),  // core-flows workflow name
		field_mappings: model.json().nullable(),   // FieldMapping[]
		static_values: model.json().nullable(),    // StaticValue[]
		metadata: model.json().nullable(),
		deliveries: model.hasMany(() => AutomationDelivery, { mappedBy: 'action' }),
		query: model.hasOne(() => AutomationQuery, { mappedBy: 'action' })
	})
	.cascades({ delete: ['deliveries', 'query'] })
