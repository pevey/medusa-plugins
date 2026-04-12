import { model } from '@medusajs/framework/utils'

export const AnalyticsEventDaily = model.define('analytics_event_daily', {
	id: model.id().primaryKey(),
	event: model.text(),
	date: model.dateTime(),
	sales_channel_id: model.text().nullable(),
	count: model.number().default(0),
	unique_actors: model.number().default(0)
})
