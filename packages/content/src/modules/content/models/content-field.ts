import { model } from '@medusajs/framework/utils'
import { ContentCollection } from './content-collection'

export const ContentField = model.define('content_field', {
	id: model.id().primaryKey(),
	name: model.text(),
	label: model.text(),
	field_type: model.text(),
	required: model.boolean().default(false),
	options: model.json().nullable(),
	default_value: model.json().nullable(),
	sort_order: model.number().default(0),
	content_collection: model.belongsTo(() => ContentCollection, {
		mappedBy: 'content_fields'
	})
})
