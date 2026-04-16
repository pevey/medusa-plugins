import { model } from '@medusajs/framework/utils'
import { ContentItem } from './content-item'
import { ContentRelationship } from './content-relationship'

export const ContentLink = model.define('content_link', {
	id: model.id().primaryKey(),
	source_item: model.belongsTo(() => ContentItem, {
		mappedBy: 'outgoing_links'
	}),
	target_item: model.belongsTo(() => ContentItem, {
		mappedBy: 'incoming_links'
	}),
	relationship: model.belongsTo(() => ContentRelationship, {
		mappedBy: 'item_links'
	})
})
