import { model } from '@medusajs/framework/utils'
import { ContentItem } from './content-item'

export const ContentTag = model.define('content_tag', {
	id: model.id().primaryKey(),
	value: model.text(),
	metadata: model.json().nullable(),
	item: model.belongsTo(() => ContentItem, {
		mappedBy: 'tags'
	})
})
