import { PaginatedResponse } from '@medusajs/framework/types'

export type ContentFormat = 'html' | 'img' | 'json' | 'md' | 'text'
export type ContentStatus = 'draft' | 'published' | 'archived'
export type ContentItemActivityType = 'publish' | 'archive' | 'draft' | 'edit' | 'note'
export type ContentCreatorActivityType = 'edit' | 'note'
export type ContentRelationshipType = 'many_to_many' | 'one_to_many' | 'many_to_one'

export type AdminContentField = {
	id: string
	name: string
	label: string
	field_type: string
	required: boolean
	options?: Record<string, unknown> | null
	default_value?: unknown
	sort_order: number
	// Never returned by `/admin/content/:collectionId/fields[/:fieldId]` (not in either
	// route's `defaults`) and not read by any admin component -- see response-contracts.ts.
	content_collection_id?: string
	created_at: string
	updated_at: string
}

export type AdminContentRelationship = {
	id: string
	relationship_type: ContentRelationshipType
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
	metadata?: Record<string, unknown> | null
	created_at: string
	updated_at: string
}

// A tag as returned by the item-scoped route (`/admin/content/:collectionId/items/:itemId/tags`),
// which never selects `item_id` -- the item is already the resource being scoped to.
export type AdminContentTag = {
	id: string
	value: string
	metadata?: Record<string, unknown> | null
	created_at: string
	updated_at: string
}

// A tag as returned by the standalone route (`/admin/content-tags[/:id]`), which does select
// `item_id` -- there's no other way to know which item a tag in this flat, cross-collection
// listing belongs to. Same underlying `content_tag` entity, different response shape per route.
export type AdminContentTagWithItem = AdminContentTag & {
	item_id: string
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
	tags?: AdminContentTag[]
	created_at: string
	updated_at: string
}

export type AdminContentItemActivity = {
	id: string
	type: ContentItemActivityType
	user_id: string
	note?: string | null
	metadata?: Record<string, unknown> | null
	created_at: string
	updated_at: string
	// Read-only module link to the core `User` entity, keyed on the plain-text `user_id`
	// column with no FK enforcement (see `src/links/*-content-item-activity-user.ts`).
	user?: { id: string }
}

export type AdminContentCreatorActivity = {
	id: string
	type: ContentCreatorActivityType
	user_id: string
	note?: string | null
	metadata?: Record<string, unknown> | null
	created_at: string
	updated_at: string
	// Read-only module link to the core `User` entity, keyed on the plain-text `user_id`
	// column with no FK enforcement (see `src/links/*-content-creator-activity-user.ts`).
	user?: { id: string }
}

export type AdminContentItemLink = {
	id: string
	created_at: string
	updated_at: string
	source_item: { id: string; title: string; slug: string }
	target_item: { id: string; title: string; slug: string }
	relationship: { id: string; relationship_type: ContentRelationshipType }
}

export type AdminContentUploadFile = {
	url: string
	key: string
}

// Response types
export type AdminContentCollectionsResponse = PaginatedResponse<{
	content_collections: AdminContentCollection[]
}>
export type AdminContentCollectionResponse = { content_collection: AdminContentCollection }
export type AdminContentCollectionFieldsResponse = PaginatedResponse<{
	fields: AdminContentField[]
}>
export type AdminContentCollectionFieldResponse = { field: AdminContentField }
export type AdminContentCollectionRelationshipsResponse = PaginatedResponse<{
	relationships: AdminContentRelationship[]
}>
export type AdminContentCollectionRelationshipResponse = { relationship: AdminContentRelationship }
export type AdminContentItemsResponse = PaginatedResponse<{
	content_items: AdminContentItem[]
}>
export type AdminContentItemResponse = { content_item: AdminContentItem }
export type AdminContentItemActivityResponse = PaginatedResponse<{
	activity: AdminContentItemActivity[]
}>
// Single-entry response for `POST /admin/content/:collectionId/items/:itemId/activity` --
// same field selection as the list route's per-entry shape, wrapped singularly under `entry`
// (there is no GET-detail route for a single item-activity entry).
export type AdminContentItemActivityEntryResponse = { entry: AdminContentItemActivity }
export type AdminContentItemLinksResponse = PaginatedResponse<{
	links: AdminContentItemLink[]
}>
// Single-entry response for `POST /admin/content/:collectionId/items/:itemId/links` -- same
// field selection as the list route's per-link shape (there is no GET-detail route for a
// single link).
export type AdminContentItemLinkResponse = { link: AdminContentItemLink }
export type AdminContentItemTagsResponse = PaginatedResponse<{
	tags: AdminContentTag[]
}>
// Single-tag response for `POST /admin/content/:collectionId/items/:itemId/tags` -- the
// item-scoped shape (no `item_id`, see `AdminContentTag` above), NOT the standalone
// `AdminContentTagResponse` below (which is bound to `/admin/content-tags` and does include
// `item_id`).
export type AdminContentItemTagResponse = { tag: AdminContentTag }
export type AdminContentCreatorsResponse = PaginatedResponse<{
	content_creators: AdminContentCreator[]
}>
export type AdminContentCreatorResponse = { content_creator: AdminContentCreator }
export type AdminContentCreatorActivityResponse = PaginatedResponse<{
	activity: AdminContentCreatorActivity[]
}>
// Single-entry response for `POST /admin/content-creators/:id/activity` -- same field
// selection as the list route's per-entry shape, wrapped singularly under `entry`.
export type AdminContentCreatorActivityEntryResponse = { entry: AdminContentCreatorActivity }
export type AdminContentTagsResponse = PaginatedResponse<{
	content_tags: AdminContentTagWithItem[]
}>
export type AdminContentTagResponse = { content_tag: AdminContentTagWithItem }
export type AdminContentUploadResponse = { files: AdminContentUploadFile[] }
