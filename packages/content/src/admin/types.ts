import { PaginatedResponse } from '@medusajs/framework/types'

export type ContentFormat = 'html' | 'img' | 'json' | 'md' | 'text'
export type ContentStatus = 'draft' | 'published' | 'archived'

export type AdminContentField = {
	id: string
	name: string
	label: string
	field_type: string
	required: boolean
	options?: Record<string, unknown> | null
	default_value?: unknown
	sort_order: number
	content_collection_id: string
	created_at: string
	updated_at: string
}

export type AdminContentRelationship = {
	id: string
	relationship_type: 'many_to_many' | 'one_to_many' | 'many_to_one'
	source_collection_id: string
	source_collection: { id: string; label: string; slug: string }
	target_collection_id: string
	target_collection: { id: string; label: string; slug: string }
	created_at: string
	updated_at: string
}

export type AdminContentCollection = {
	id: string
	label: string
	slug: string
	format: ContentFormat
	prefix: string | null
	metadata?: Record<string, unknown> | null
	content_fields?: AdminContentField[]
	source_relationships?: AdminContentRelationship[]
	target_relationships?: AdminContentRelationship[]
	created_at: string
	updated_at: string
}

export type AdminContentCreator = {
	id: string
	name: string
	bio?: string | null
	avatar_url?: string | null
}

export type AdminContentItem = {
	id: string
	title: string
	slug: string
	body: string | null
	status: ContentStatus
	published_at: string | null
	metadata?: Record<string, unknown> | null
	content_collection_id: string
	content_collection?: AdminContentCollection
	creator_id?: string | null
	creator?: AdminContentCreator | null
	created_at: string
	updated_at: string
}

// Response types
export type AdminContentCollectionsResponse = PaginatedResponse<{
	content_collections: AdminContentCollection[]
}>
export type AdminContentCollectionResponse = { content_collection: AdminContentCollection }
export type AdminContentItemsResponse = PaginatedResponse<{
	content_items: AdminContentItem[]
}>
export type AdminContentItemResponse = { content_item: AdminContentItem }
