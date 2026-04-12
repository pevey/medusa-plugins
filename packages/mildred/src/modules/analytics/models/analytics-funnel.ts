import { model } from '@medusajs/framework/utils'

export const AnalyticsFunnel = model.define('analytics_funnel', {
	id: model.id().primaryKey(),
	name: model.text().unique(),
	label: model.text(),
	description: model.text().nullable(),
	steps: model.json(),
	sales_channel_id: model.text().nullable(),
	is_default: model.boolean().default(false)
})
