import { model } from '@medusajs/framework/utils'

export const AnalyticsIdentity = model.define('analytics_identity', {
	id: model.id().primaryKey(),
	actor_id: model.text().unique(),
	customer_id: model.text().nullable(),
	anonymous_ids: model.json().default([] as unknown as Record<string, unknown>),
	properties: model.json().nullable(),
	last_seen_at: model.dateTime().nullable()
})
