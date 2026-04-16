import { model } from '@medusajs/framework/utils'
import { WebhookAction } from './webhook-action'

export const WebhookQuery = model.define('webhookQuery', {
	id: model.id().primaryKey(),
	action: model.belongsTo(() => WebhookAction, { mappedBy: 'query' }),
	entity_name: model.text(),
	fields: model.json().nullable(),   // string[] — passed as options.fields to query.graph()
	filters: model.json().nullable(),  // Record<string, unknown> — supports $event.path references
	limit: model.number().default(10)  // options.pagination.take, max 100
})
