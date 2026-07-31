import multer from 'multer'
import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import {
	StoreGetContentCollections,
	StoreGetContentCollection,
	StoreGetContentItems,
	StoreGetContentItem,
	AdminAddContentTag,
	AdminCreateContentCreator,
	AdminCreateContentCreatorActivity,
	AdminCreateContentItem,
	AdminCreateContentItemActivity,
	AdminCreateContentItemLink,
	AdminCreateContentTag,
	AdminCreateContentCollection,
	AdminCreateContentCollectionField,
	AdminCreateContentCollectionRelationship,
	AdminDeleteContentCreatorActivity,
	AdminDeleteContentCreators,
	AdminDeleteContentItemActivity,
	AdminDeleteContentItems,
	AdminDeleteContentTags,
	AdminDeleteContentCollectionFields,
	AdminDeleteContentCollections,
	AdminGetContentCreator,
	AdminGetContentCreatorActivity,
	AdminGetContentCreators,
	AdminGetContentItem,
	AdminGetContentItemActivity,
	AdminGetContentItemLinks,
	AdminGetContentItems,
	AdminGetContentTag,
	AdminGetContentTags,
	AdminGetContentCollection,
	AdminGetContentCollectionField,
	AdminGetContentCollectionFields,
	AdminGetContentCollectionRelationship,
	AdminGetContentCollectionRelationships,
	AdminGetContentCollections,
	AdminRemoveContentTags,
	AdminUpdateContentCreator,
	AdminUpdateContentItem,
	AdminUpdateContentTag,
	AdminUpdateContentCollection,
	AdminUpdateContentCollectionField
} from './validators'

// ── Shared field selections ──────────────────────────────────────────────────
//
// Exported so mutation routes can re-fetch through `query.graph` with the EXACT same
// selection their matching GET route uses, guaranteeing shape parity (task 4d: mutation
// responses must match their GET counterpart's field-selected shape, not the raw
// `MedusaService`-returned ORM entity). A single shared array also rules out the two
// arrays silently drifting apart over time.

export const COLLECTION_DETAIL_FIELDS = [
	'id',
	'label',
	'slug',
	'format',
	'prefix',
	'metadata',
	'created_at',
	'updated_at',
	'content_fields.id',
	'content_fields.name',
	'content_fields.label',
	'content_fields.field_type',
	'content_fields.required',
	'content_fields.options',
	'content_fields.default_value',
	'content_fields.sort_order',
	'content_fields.created_at',
	'content_fields.updated_at',
	'source_relationships.id',
	'source_relationships.relationship_type',
	'source_relationships.source_collection_id',
	'source_relationships.target_collection_id',
	'source_relationships.created_at',
	'source_relationships.updated_at',
	'source_relationships.source_collection.id',
	'source_relationships.source_collection.label',
	'source_relationships.source_collection.slug',
	'source_relationships.target_collection.id',
	'source_relationships.target_collection.label',
	'source_relationships.target_collection.slug',
	'target_relationships.id',
	'target_relationships.relationship_type',
	'target_relationships.source_collection_id',
	'target_relationships.target_collection_id',
	'target_relationships.created_at',
	'target_relationships.updated_at',
	'target_relationships.source_collection.id',
	'target_relationships.source_collection.label',
	'target_relationships.source_collection.slug',
	'target_relationships.target_collection.id',
	'target_relationships.target_collection.label',
	'target_relationships.target_collection.slug'
]

export const CONTENT_FIELD_FIELDS = ['id', 'name', 'label', 'field_type', 'required', 'options', 'default_value', 'sort_order', 'created_at', 'updated_at']

export const CONTENT_RELATIONSHIP_FIELDS = [
	'id',
	'relationship_type',
	'source_collection_id',
	'target_collection_id',
	'created_at',
	'updated_at',
	'source_collection.id',
	'source_collection.label',
	'source_collection.slug',
	'target_collection.id',
	'target_collection.label',
	'target_collection.slug'
]

export const ITEM_DETAIL_FIELDS = [
	'id',
	'title',
	'slug',
	'body',
	'status',
	'published_at',
	'metadata',
	'created_at',
	'updated_at',
	// The flat FK column, distinct from the nested `content_collection.id` a few lines below.
	// `EditContentItemDrawer` reads it directly (`useUpdateContentItem(item.content_collection_id,
	// item.id)`) to build the update URL. It was missing here, so every fetched item's
	// `content_collection_id` was silently `undefined`, sending every edit-drawer save to
	// `/admin/content/undefined/items/:itemId` and failing outright.
	'content_collection_id',
	'content_collection.id',
	'content_collection.label',
	'content_collection.slug',
	'content_collection.format',
	'content_collection.content_fields.id',
	'content_collection.content_fields.name',
	'content_collection.content_fields.label',
	'content_collection.content_fields.field_type',
	'content_collection.content_fields.required',
	'content_collection.content_fields.options',
	'content_collection.content_fields.sort_order',
	'creator.id',
	'creator.name',
	'creator.bio',
	'creator.avatar_url',
	'tags.id',
	'tags.value',
	'tags.metadata'
]

export const ITEM_ACTIVITY_FIELDS = ['id', 'type', 'user_id', 'note', 'metadata', 'created_at', 'updated_at', 'user.*']

export const CREATOR_ACTIVITY_FIELDS = ['id', 'type', 'user_id', 'note', 'metadata', 'created_at', 'updated_at', 'user.*']

export const ITEM_LINK_FIELDS = [
	'id',
	'created_at',
	'updated_at',
	'source_item.id',
	'source_item.title',
	'source_item.slug',
	'target_item.id',
	'target_item.title',
	'target_item.slug',
	'relationship.id',
	'relationship.relationship_type'
]

export default defineMiddlewares([
	// Content Collections
	{
		matcher: '/admin/content',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentCollections, {
				defaults: ['id', 'label', 'slug', 'format', 'prefix', 'metadata', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{
		matcher: '/admin/content',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateContentCollection)]
	},
	{
		matcher: '/admin/content',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteContentCollections)]
	},
	{
		matcher: '/admin/content/:collectionId',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentCollection, {
				defaults: COLLECTION_DETAIL_FIELDS,
				isList: false
			})
		]
	},
	{
		matcher: '/admin/content/:collectionId',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateContentCollection)]
	},
	{
		matcher: '/admin/content/:collectionId/fields',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentCollectionFields, {
				defaults: CONTENT_FIELD_FIELDS,
				isList: true,
				defaultLimit: 50
			})
		]
	},
	{
		matcher: '/admin/content/:collectionId/fields',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateContentCollectionField)]
	},
	{
		matcher: '/admin/content/:collectionId/fields',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteContentCollectionFields)]
	},
	{
		matcher: '/admin/content/:collectionId/fields/:fieldId',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentCollectionField, {
				defaults: CONTENT_FIELD_FIELDS,
				isList: false
			})
		]
	},
	{
		matcher: '/admin/content/:collectionId/fields/:fieldId',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateContentCollectionField)]
	},
	{
		matcher: '/admin/content/:collectionId/upload',
		method: ['POST'],
		middlewares: [
			(req: any, res: any, next: any) => {
				const upload = multer({ storage: multer.memoryStorage() }).array('files')
				;(upload as any)(req, res, (err: any) => {
					if (err) {
						return res.status(400).json({ type: 'invalid_data', message: 'No files were uploaded' })
					}
					next()
				})
			}
		]
	},
	{
		matcher: '/admin/content/:collectionId/relationships',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentCollectionRelationships, {
				defaults: CONTENT_RELATIONSHIP_FIELDS,
				isList: true,
				defaultLimit: 50
			})
		]
	},
	{
		matcher: '/admin/content/:collectionId/relationships',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateContentCollectionRelationship)]
	},
	{
		matcher: '/admin/content/:collectionId/relationships/:relId',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentCollectionRelationship, {
				defaults: CONTENT_RELATIONSHIP_FIELDS,
				isList: false
			})
		]
	},
	// Content Items (nested under collections)
	{
		matcher: '/admin/content/:collectionId/items',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentItems, {
				defaults: [
					'id',
					'title',
					'slug',
					'body',
					'status',
					'published_at',
					'metadata',
					'created_at',
					'updated_at',
					'content_collection.id',
					'content_collection.label',
					'content_collection.slug',
					'creator.id',
					'creator.name',
					'tags.id',
					'tags.value',
					'tags.metadata'
				],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{
		matcher: '/admin/content/:collectionId/items',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateContentItem)]
	},
	{
		matcher: '/admin/content/:collectionId/items',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteContentItems)]
	},
	{
		matcher: '/admin/content/:collectionId/items/:itemId',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentItem, {
				defaults: ITEM_DETAIL_FIELDS,
				isList: false
			})
		]
	},
	{
		matcher: '/admin/content/:collectionId/items/:itemId',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateContentItem)]
	},
	{
		matcher: '/admin/content/:collectionId/items/:itemId/activity',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentItemActivity, {
				defaults: ITEM_ACTIVITY_FIELDS,
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/content/:collectionId/items/:itemId/activity',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateContentItemActivity)]
	},
	{
		matcher: '/admin/content/:collectionId/items/:itemId/activity',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteContentItemActivity)]
	},
	{
		matcher: '/admin/content/:collectionId/items/:itemId/links',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentItemLinks, {
				defaults: ITEM_LINK_FIELDS,
				isList: true,
				defaultLimit: 50
			})
		]
	},
	{
		matcher: '/admin/content/:collectionId/items/:itemId/links',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateContentItemLink)]
	},
	{
		matcher: '/admin/content/:collectionId/items/:itemId/tags',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentTags, {
				defaults: ['id', 'value', 'metadata', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 50
			})
		]
	},
	{
		matcher: '/admin/content/:collectionId/items/:itemId/tags',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminAddContentTag)]
	},
	{
		matcher: '/admin/content/:collectionId/items/:itemId/tags',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminRemoveContentTags)]
	},
	// Content Creators
	{
		matcher: '/admin/content-creators',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentCreators, {
				defaults: ['id', 'name', 'bio', 'avatar_url', 'metadata', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{
		matcher: '/admin/content-creators',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateContentCreator)]
	},
	{
		matcher: '/admin/content-creators',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteContentCreators)]
	},
	{
		matcher: '/admin/content-creators/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentCreator, {
				defaults: ['id', 'name', 'bio', 'avatar_url', 'metadata', 'created_at', 'updated_at'],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/content-creators/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateContentCreator)]
	},
	{
		matcher: '/admin/content-creators/:id/activity',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentCreatorActivity, {
				defaults: CREATOR_ACTIVITY_FIELDS,
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/content-creators/:id/activity',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateContentCreatorActivity)]
	},
	{
		matcher: '/admin/content-creators/:id/activity',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteContentCreatorActivity)]
	},
	// Content Tags
	{
		matcher: '/admin/content-tags',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentTags, {
				defaults: ['id', 'value', 'metadata', 'created_at', 'updated_at', 'item_id'],
				isList: true,
				defaultLimit: 50
			})
		]
	},
	{
		matcher: '/admin/content-tags',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateContentTag)]
	},
	{
		matcher: '/admin/content-tags',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteContentTags)]
	},
	{
		matcher: '/admin/content-tags/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetContentTag, {
				defaults: ['id', 'value', 'metadata', 'created_at', 'updated_at', 'item_id'],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/content-tags/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateContentTag)]
	},
	// ── Store ────────────────────────────────────────────────────────────────
	{
		matcher: '/content',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(StoreGetContentCollections, {
				defaults: ['id', 'label', 'slug', 'format', 'prefix', 'metadata'],
				isList: true,
				defaultLimit: 50
			})
		]
	},
	{
		matcher: '/content/:slug',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(StoreGetContentCollection, {
				defaults: [
					'id',
					'label',
					'slug',
					'format',
					'prefix',
					'metadata',
					'content_fields.id',
					'content_fields.name',
					'content_fields.label',
					'content_fields.field_type',
					'content_fields.sort_order'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/content/:slug/items',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(StoreGetContentItems, {
				defaults: [
					'id',
					'title',
					'slug',
					'body',
					'status',
					'published_at',
					'metadata',
					'created_at',
					'content_collection.id',
					'content_collection.label',
					'content_collection.slug',
					'creator.id',
					'creator.name',
					'tags.id',
					'tags.value'
				],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{
		matcher: '/content/:slug/items/:itemSlug',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(StoreGetContentItem, {
				defaults: [
					'id',
					'title',
					'slug',
					'body',
					'status',
					'published_at',
					'metadata',
					'created_at',
					'content_collection.id',
					'content_collection.label',
					'content_collection.slug',
					'content_collection.format',
					'content_collection.content_fields.id',
					'content_collection.content_fields.name',
					'content_collection.content_fields.label',
					'content_collection.content_fields.field_type',
					'content_collection.content_fields.sort_order',
					'creator.id',
					'creator.name',
					'creator.bio',
					'creator.avatar_url',
					'tags.id',
					'tags.value',
					'tags.metadata'
				],
				isList: false
			})
		]
	}
])
