// Source: packages/content/src/api/validators.ts
// Routes: GET /content, GET /content/:slug, GET /content/:slug/items, GET /content/:slug/items/:itemSlug

export interface ContentCollection {
	id: string
	label: string
	slug: string
	format: string
	prefix?: string
	metadata?: Record<string, unknown>
	content_fields?: ContentField[]
	created_at: string
	updated_at: string
}

export interface ContentField {
	id: string
	name: string
	label: string
	field_type: string
	required?: boolean
	options?: string
	default_value?: string
	sort_order?: number
}

export interface ContentItem {
	id: string
	title: string
	slug: string
	body?: string
	format?: string
	status: string
	published_at?: string
	metadata?: Record<string, unknown>
	content_collection?: Pick<ContentCollection, 'id' | 'label' | 'slug' | 'format'>
	creator?: ContentCreator
	tags?: ContentTag[]
	created_at: string
	updated_at?: string
}

export interface ContentCreator {
	id: string
	name: string
	bio?: string
	avatar_url?: string
}

export interface ContentTag {
	id: string
	value: string
	metadata?: Record<string, unknown>
}

// ── Store Query/Response ─────────────────────────────────────────────────────

export interface StoreContentListQuery {
	q?: string
	limit?: number
	offset?: number
	fields?: string
}

export interface StoreContentCollectionListResponse {
	content_collections: ContentCollection[]
	count: number
	limit: number
	offset: number
}

export interface StoreContentCollectionResponse {
	content_collection: ContentCollection
}

export interface StoreContentItemListQuery {
	tag?: string
	q?: string
	limit?: number
	offset?: number
	fields?: string
}

export interface StoreContentItemListResponse {
	content_items: ContentItem[]
	count: number
	limit: number
	offset: number
}

export interface StoreContentItemResponse {
	content_item: ContentItem
}
