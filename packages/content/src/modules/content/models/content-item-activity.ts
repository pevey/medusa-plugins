import { model } from '@medusajs/framework/utils'
import { ContentItem } from './content-item'

export enum ContentItemActivityType {
	PUBLISH = 'publish',
	ARCHIVE = 'archive',
	DRAFT = 'draft',
	EDIT = 'edit',
	NOTE = 'note'
}

export const ContentItemActivity = model.define('content_item_activity', {
	id: model.id().primaryKey(),
	type: model.enum(ContentItemActivityType).default(ContentItemActivityType.NOTE),
	user_id: model.text(), // needed for read-only link to user
	note: model.text().nullable(),
	metadata: model.json().nullable(),
	item: model.belongsTo(() => ContentItem, {
		mappedBy: 'activity'
	})
})
