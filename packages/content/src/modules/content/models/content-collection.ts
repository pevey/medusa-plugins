import { model } from '@medusajs/framework/utils'
import { ContentField } from './content-field'
import { ContentRelationship } from './content-relationship'
import { ContentItem } from './content-item'

export enum ContentFormat {
	HTML = 'html',
	IMG = 'img',
	JSON = 'json',
	MD = 'md',
	TEXT = 'text'
}

export const ContentCollection = model
	.define('content_collection', {
		id: model.id().primaryKey(),
		label: model.text(),
		slug: model.text().unique(),
		format: model.enum(ContentFormat),
		prefix: model.text().nullable(),
		metadata: model.json().nullable(),
		content_fields: model.hasMany(() => ContentField, {
			mappedBy: 'content_collection'
		}),
		source_relationships: model.hasMany(() => ContentRelationship, {
			mappedBy: 'source_collection'
		}),
		target_relationships: model.hasMany(() => ContentRelationship, {
			mappedBy: 'target_collection'
		}),
		items: model.hasMany(() => ContentItem, {
			mappedBy: 'content_collection'
		})
	})
	.cascades({
		delete: ['content_fields', 'source_relationships', 'target_relationships', 'items']
	})
