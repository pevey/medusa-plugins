import { model } from '@medusajs/framework/utils'

export enum AnalyticsEventSource {
	STOREFRONT = 'storefront',
	BACKEND = 'backend'
}

export const AnalyticsEvent = model.define('analytics_event', {
	id: model.id().primaryKey(),
	event: model.text(),
	actor_id: model.text().nullable(),
	group_type: model.text().nullable(),
	group_id: model.text().nullable(),
	properties: model.json().nullable(),
	session_id: model.text().nullable(),
	source: model.enum(AnalyticsEventSource).default(AnalyticsEventSource.BACKEND),
	sales_channel_id: model.text().nullable(),
	timestamp: model.dateTime()
})
