import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'
import { ContentFormat } from '../modules/content/models/content-collection'
import { ContentRelationshipType } from '../modules/content/models/content-relationship'
import { ContentStatus } from '../modules/content/models/content-item'
import { ContentCreatorActivityType } from '../modules/content/models/content-creator-activity'
import { ContentItemActivityType } from '../modules/content/models/content-item-activity'

// ── Content Collections ─────────────────��────────────────────────────────────

export const AdminGetContentCollections = createFindParams({ limit: 15, offset: 0 }).extend({
	q: z.string().optional()
})
export type AdminGetContentCollectionsType = z.infer<typeof AdminGetContentCollections>

export const AdminGetContentCollection = createFindParams()
export type AdminGetContentCollectionType = z.infer<typeof AdminGetContentCollection>

const slugSchema = z
	.string()
	.regex(
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		'Slug must use only lowercase letters, numbers, and hyphens'
	)

export const AdminCreateContentCollection = z.object({
	label: z.string(),
	slug: slugSchema,
	format: z.enum(ContentFormat),
	prefix: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminCreateContentCollectionType = z.infer<typeof AdminCreateContentCollection>

export const AdminUpdateContentCollection = z.object({
	label: z.string().optional(),
	slug: slugSchema.optional(),
	prefix: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminUpdateContentCollectionType = z.infer<typeof AdminUpdateContentCollection>

export const AdminDeleteContentCollections = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteContentCollectionsType = z.infer<typeof AdminDeleteContentCollections>

// ── Content Collection Fields ───────────���────────────────────────────────────

export const AdminGetContentCollectionFields = createFindParams({ limit: 50, offset: 0 })
export type AdminGetContentCollectionFieldsType = z.infer<typeof AdminGetContentCollectionFields>

export const AdminGetContentCollectionField = createFindParams()
export type AdminGetContentCollectionFieldType = z.infer<typeof AdminGetContentCollectionField>

export const AdminCreateContentCollectionField = z.object({
	name: z.string(),
	label: z.string(),
	field_type: z.string(),
	required: z.boolean().optional(),
	options: z.record(z.string(), z.unknown()).nullable().optional(),
	default_value: z.any(),
	sort_order: z.number().int().optional()
})
export type AdminCreateContentCollectionFieldType = z.infer<typeof AdminCreateContentCollectionField>

export const AdminUpdateContentCollectionField = z.object({
	label: z.string().optional(),
	field_type: z.string().optional(),
	required: z.boolean().optional(),
	options: z.record(z.string(), z.unknown()).nullable().optional(),
	default_value: z.any(),
	sort_order: z.number().int().optional()
})
export type AdminUpdateContentCollectionFieldType = z.infer<typeof AdminUpdateContentCollectionField>

export const AdminDeleteContentCollectionFields = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteContentCollectionFieldsType = z.infer<typeof AdminDeleteContentCollectionFields>

// ── Content Collection Relationships ─────────────────────────────────────────

export const AdminGetContentCollectionRelationships = createFindParams({ limit: 50, offset: 0 })
export type AdminGetContentCollectionRelationshipsType = z.infer<typeof AdminGetContentCollectionRelationships>

export const AdminGetContentCollectionRelationship = createFindParams()
export type AdminGetContentCollectionRelationshipType = z.infer<typeof AdminGetContentCollectionRelationship>

export const AdminCreateContentCollectionRelationship = z.object({
	target_collection_id: z.string(),
	relationship_type: z.enum(ContentRelationshipType)
})
export type AdminCreateContentCollectionRelationshipType = z.infer<
	typeof AdminCreateContentCollectionRelationship
>

// ── Content Creators ──────────────��───────────────────────────────────────────

export const AdminGetContentCreators = createFindParams({ limit: 15, offset: 0 }).extend({
	q: z.string().optional()
})
export type AdminGetContentCreatorsType = z.infer<typeof AdminGetContentCreators>

export const AdminGetContentCreator = createFindParams()
export type AdminGetContentCreatorType = z.infer<typeof AdminGetContentCreator>

export const AdminCreateContentCreator = z.object({
	name: z.string(),
	bio: z.string().nullable().optional(),
	avatar_url: z.url().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminCreateContentCreatorType = z.infer<typeof AdminCreateContentCreator>

export const AdminUpdateContentCreator = z.object({
	name: z.string().optional(),
	bio: z.string().nullable().optional(),
	avatar_url: z.url().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminUpdateContentCreatorType = z.infer<typeof AdminUpdateContentCreator>

export const AdminDeleteContentCreators = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteContentCreatorsType = z.infer<typeof AdminDeleteContentCreators>

// ── Content Creator Activity ──────────────────────────────────────────────────

export const AdminGetContentCreatorActivity = createFindParams({ limit: 20, offset: 0 })
export type AdminGetContentCreatorActivityType = z.infer<typeof AdminGetContentCreatorActivity>

export const AdminCreateContentCreatorActivity = z.object({
	type: z.enum(ContentCreatorActivityType).default(ContentCreatorActivityType.NOTE),
	note: z.string().nullable().optional()
})
export type AdminCreateContentCreatorActivityType = z.infer<
	typeof AdminCreateContentCreatorActivity
>

export const AdminDeleteContentCreatorActivity = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteContentCreatorActivityType = z.infer<
	typeof AdminDeleteContentCreatorActivity
>

// ── Content Items ─────────────────────────────────────────────────────────────

export const AdminGetContentItems = createFindParams({ limit: 15, offset: 0 }).extend({
	creator_id: z.string().optional(),
	status: z.enum(ContentStatus).optional(),
	q: z.string().optional()
})
export type AdminGetContentItemsType = z.infer<typeof AdminGetContentItems>

export const AdminGetContentItem = createFindParams()
export type AdminGetContentItemType = z.infer<typeof AdminGetContentItem>

export const AdminCreateContentItem = z.object({
	title: z.string(),
	slug: slugSchema,
	creator_id: z.string().nullable().optional(),
	body: z.string().nullable().optional(),
	status: z.enum(ContentStatus).optional(),
	published_at: z.coerce.date().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminCreateContentItemType = z.infer<typeof AdminCreateContentItem>

export const AdminUpdateContentItem = z.object({
	title: z.string().optional(),
	slug: slugSchema.optional(),
	creator_id: z.string().nullable().optional(),
	body: z.string().nullable().optional(),
	status: z.enum(ContentStatus).optional(),
	published_at: z.coerce.date().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminUpdateContentItemType = z.infer<typeof AdminUpdateContentItem>

export const AdminDeleteContentItems = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteContentItemsType = z.infer<typeof AdminDeleteContentItems>

// ── Content Item Activity ─��───────────────────────────────────────────────────

export const AdminGetContentItemActivity = createFindParams({ limit: 20, offset: 0 })
export type AdminGetContentItemActivityType = z.infer<typeof AdminGetContentItemActivity>

export const AdminCreateContentItemActivity = z.object({
	type: z.enum(ContentItemActivityType).default(ContentItemActivityType.NOTE),
	note: z.string().nullable().optional()
})
export type AdminCreateContentItemActivityType = z.infer<typeof AdminCreateContentItemActivity>

export const AdminDeleteContentItemActivity = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteContentItemActivityType = z.infer<typeof AdminDeleteContentItemActivity>

// ── Content Item Links ────────────────────────────────────────────────────────

export const AdminGetContentItemLinks = createFindParams({ limit: 50, offset: 0 })
export type AdminGetContentItemLinksType = z.infer<typeof AdminGetContentItemLinks>

export const AdminCreateContentItemLink = z.object({
	target_item_id: z.string(),
	relationship_id: z.string()
})
export type AdminCreateContentItemLinkType = z.infer<typeof AdminCreateContentItemLink>

// ── Content Tags ──────────────────────────────────────────────────────────────

export const AdminGetContentTags = createFindParams({ limit: 50, offset: 0 }).extend({
	item_id: z.string().optional(),
	q: z.string().optional()
})
export type AdminGetContentTagsType = z.infer<typeof AdminGetContentTags>

export const AdminGetContentTag = createFindParams()
export type AdminGetContentTagType = z.infer<typeof AdminGetContentTag>

export const AdminCreateContentTag = z.object({
	value: z.string(),
	item_id: z.string(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminCreateContentTagType = z.infer<typeof AdminCreateContentTag>

export const AdminUpdateContentTag = z.object({
	value: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminUpdateContentTagType = z.infer<typeof AdminUpdateContentTag>

export const AdminDeleteContentTags = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteContentTagsType = z.infer<typeof AdminDeleteContentTags>

export const AdminAddContentTag = z.object({
	value: z.string(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminAddContentTagType = z.infer<typeof AdminAddContentTag>

export const AdminRemoveContentTags = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminRemoveContentTagsType = z.infer<typeof AdminRemoveContentTags>

// ── Store ─────────────────────────────────────��──────────────────────────────

export const StoreGetContentCollections = createFindParams({ limit: 50, offset: 0 }).extend({
	q: z.string().optional()
})
export type StoreGetContentCollectionsType = z.infer<typeof StoreGetContentCollections>

export const StoreGetContentCollection = createFindParams()
export type StoreGetContentCollectionType = z.infer<typeof StoreGetContentCollection>

export const StoreGetContentItems = createFindParams({ limit: 15, offset: 0 }).extend({
	tag: z.string().optional(),
	q: z.string().optional()
})
export type StoreGetContentItemsType = z.infer<typeof StoreGetContentItems>

export const StoreGetContentItem = createFindParams()
export type StoreGetContentItemType = z.infer<typeof StoreGetContentItem>
