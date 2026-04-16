import { model } from '@medusajs/framework/utils'

export const AnalyticsSegment = model.define('analytics_segment', {
	id: model.id().primaryKey(),
	name: model.text().unique(),
	label: model.text(),
	description: model.text().nullable(),
	rules: model.json(),
	sales_channel_id: model.text().nullable(),
	created_by: model.text().nullable()
})
