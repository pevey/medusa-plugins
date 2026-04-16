import { model } from '@medusajs/framework/utils'

export const AnalyticsRubric = model.define('analytics_rubric', {
	id: model.id().primaryKey(),
	name: model.text().unique(),
	label: model.text(),
	description: model.text().nullable(),
	expected_properties: model.json().nullable(),
	active: model.boolean().default(true)
})
