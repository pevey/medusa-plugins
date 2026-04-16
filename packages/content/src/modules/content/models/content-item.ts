import { model } from '@medusajs/framework/utils'
import { ContentCollection } from './content-collection'
import { ContentCreator } from './content-creator'
import { ContentLink } from './content-link'
import { ContentItemActivity } from './content-item-activity'
import { ContentTag } from './content-tag'

export enum ContentStatus {
	DRAFT = 'draft',
	PUBLISHED = 'published',
	ARCHIVED = 'archived'
}

export const ContentItem = model
	.define('content_item', {
		id: model.id().primaryKey(),
		title: model.text(),
		slug: model.text().searchable(),
		body: model.text().nullable(),
		status: model.enum(ContentStatus).default(ContentStatus.DRAFT),
		published_at: model.dateTime().nullable(),
		metadata: model.json().nullable(),
		content_collection: model.belongsTo(() => ContentCollection, {
			mappedBy: 'items'
		}),
		creator: model
			.belongsTo(() => ContentCreator, {
				mappedBy: 'items'
			})
			.nullable(),
		tags: model.hasMany(() => ContentTag, {
			mappedBy: 'item'
		}),
		outgoing_links: model.hasMany(() => ContentLink, {
			mappedBy: 'source_item'
		}),
		incoming_links: model.hasMany(() => ContentLink, {
			mappedBy: 'target_item'
		}),
		activity: model.hasMany(() => ContentItemActivity, {
			mappedBy: 'item'
		})
	})
	.cascades({
		delete: ['outgoing_links', 'incoming_links', 'tags', 'activity']
	})
