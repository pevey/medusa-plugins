import { model } from '@medusajs/framework/utils'

export const AnalyticsSegmentMembership = model.define('analytics_segment_membership', {
	id: model.id().primaryKey(),
	segment_id: model.text(),
	actor_id: model.text(),
	evaluated_at: model.dateTime()
})
