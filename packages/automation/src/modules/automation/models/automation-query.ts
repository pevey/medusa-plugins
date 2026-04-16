import { model } from '@medusajs/framework/utils'
import { AutomationAction } from './automation-action'

export const AutomationQuery = model.define('automationQuery', {
	id: model.id().primaryKey(),
	action: model.belongsTo(() => AutomationAction, { mappedBy: 'query' }),
	entity_name: model.text(),
	fields: model.json().nullable(),   // string[] — passed as options.fields to query.graph()
	filters: model.json().nullable(),  // Record<string, unknown> — supports $event.path references
	limit: model.number().default(10)  // options.pagination.take, max 100
})
