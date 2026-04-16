import { model } from '@medusajs/framework/utils'
import { ContentCollection } from './content-collection'
import { ContentLink } from './content-link'

export enum ContentRelationshipType {
	MANY_TO_MANY = 'many_to_many',
	ONE_TO_MANY = 'one_to_many',
	MANY_TO_ONE = 'many_to_one'
}

export const ContentRelationship = model.define('content_relationship', {
	id: model.id().primaryKey(),
	relationship_type: model.enum(ContentRelationshipType),
	source_collection: model.belongsTo(() => ContentCollection, {
		mappedBy: 'source_relationships'
	}),
	target_collection: model.belongsTo(() => ContentCollection, {
		mappedBy: 'target_relationships'
	}),
	item_links: model.hasMany(() => ContentLink, {
		mappedBy: 'relationship'
	})
})
