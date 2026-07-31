/**
 * Response contracts for the content admin (and, as a bonus, public storefront) API.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the hand-written
 * admin view types in `../../src/admin/types`. Nothing previously verified those
 * hand-written types actually matched what the routes return -- the admin dashboard
 * is bundled by Vite and never typechecked against a real HTTP response, and the
 * test harness fakes the SDK, so it only ever sees fixtures a test author wrote.
 * This module plus the `.parse()` calls in `content.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-content typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in content.spec.ts. A route that
 *                           stops returning a field, or starts returning an extra
 *                           one, fails the parse -- `z.strictObject` rejects unknown
 *                           keys, so both directions are caught, not just missing ones.
 *   3. type <-> components  tsc, via the admin dashboard's own typecheck (not part of
 *                           this file). A view that reads a field the type no longer
 *                           declares fails to compile.
 *
 * A route changing shape fails link 2; "fixing" the schema to match would silently
 * break link 3 for every component reading the removed/changed field, so schema
 * drift is a finding about the TYPE (and by extension the components that read it),
 * never a reason to loosen the schema. See task-4c-content-report.md for every
 * mismatch found while building this file and which side was fixed.
 *
 * Core-Medusa entities embedded in a response (here: just `user`, via a read-only
 * module link on activity entries) are deliberately NOT modelled field-by-field:
 * this file tests THIS plugin's contract, not Medusa's. They get
 * `z.object({ id: z.string() }).passthrough()`.
 *
 * Per-route projections (NOT core-Medusa entities): content is this plugin's own
 * data, so most nested collection/creator/tag stubs below are modelled directly as
 * literal partial shapes rather than reusing the full `AdminContentCollection` /
 * `AdminContentCreator` / `AdminContentTag` schema, because several routes
 * deliberately under-select those entities relative to their full type:
 *   - `AdminGetContentTags` is bound to TWO routes with different `defaults` --
 *     the item-scoped tags route omits `item_id`, the standalone `/admin/content-tags`
 *     route includes it. Modelled as two distinct schemas/types (`AdminContentTag` and
 *     `AdminContentTagWithItem`), not one shared shape with an optional field.
 *   - `AdminContentItem.content_collection` / `.creator` / `.tags` are projected
 *     differently by the list route (`/admin/content/:id/items`) vs. the detail route
 *     (`/admin/content/:id/items/:itemId`) -- the detail route additionally expands
 *     `content_collection.format` and `.content_fields`, and `creator.bio`/`.avatar_url`.
 *     Modelled as two distinct schemas (`AdminContentItemListSchema` /
 *     `AdminContentItemDetailSchema`), each checked against a locally narrowed
 *     "Contract" type alias (same technique complaints uses for `CoreEntityRef`,
 *     applied here to a plugin-owned partial projection instead of a core entity).
 *
 * POST/PUT create-and-update routes for this plugin previously returned the raw
 * `MedusaService`-generated entity (e.g. `contentService.createContentCollections(...)`)
 * directly, leaking `deleted_at` (every table in this module has a `deleted_at` column),
 * internal `metadata`, and uninitialized hasMany Collection proxies (`content_fields`,
 * `source_relationships`, `tags`, etc.) relative to the hand-written type. This has since
 * been fixed for every mutation route in this plugin (task 4d, overriding task 4c's
 * earlier scope decision to leave the pattern alone) -- each route either re-fetches
 * through the same `query.graph` selection its matching GET route uses (relations
 * involved) or destructures down to the declared fields (flat entity, no relations
 * touched). Every mutation response below is now asserted with the SAME schema its GET
 * counterpart uses (or, where no GET-detail route exists for a singular shape -- item
 * links, item/creator activity entries, item-scoped tag add -- a new schema sharing the
 * list route's per-item projection). See task-4d-content-report.md for the full route
 * list and technique-per-route rationale.
 *
 * Bulk-delete acks (`{ deleted: string[] }`), the tag-remove ack, and the file-upload
 * response are legitimately different shapes from any GET and are NOT forced into
 * parity -- they were never raw-entity leaks in the first place.
 */
import { z } from '@medusajs/framework/zod'
import type {
	AdminContentCollection,
	AdminContentCollectionFieldResponse,
	AdminContentCollectionFieldsResponse,
	AdminContentCollectionResponse,
	AdminContentCollectionRelationshipResponse,
	AdminContentCollectionRelationshipsResponse,
	AdminContentCollectionsResponse,
	AdminContentCreator,
	AdminContentCreatorActivity,
	AdminContentCreatorActivityEntryResponse,
	AdminContentCreatorActivityResponse,
	AdminContentCreatorResponse,
	AdminContentCreatorsResponse,
	AdminContentField,
	AdminContentItem,
	AdminContentItemActivity,
	AdminContentItemActivityEntryResponse,
	AdminContentItemActivityResponse,
	AdminContentItemLink,
	AdminContentItemLinkResponse,
	AdminContentItemLinksResponse,
	AdminContentItemResponse,
	AdminContentItemsResponse,
	AdminContentItemTagResponse,
	AdminContentItemTagsResponse,
	AdminContentRelationship,
	AdminContentTag,
	AdminContentTagResponse,
	AdminContentTagsResponse,
	AdminContentTagWithItem,
	AdminContentUploadResponse
} from '../../src/admin/types'

// A core-Medusa entity embedded in one of this plugin's responses (here: `AdminUser`,
// via the read-only `user_id` module link on activity entries). Only `id` is
// asserted at runtime -- `.passthrough()` keeps whatever other keys the route
// happens to return without asserting on them.
//
// The TS-facing type is force-narrowed to `CoreEntityRef` (`{ id: string }`) via
// the `as unknown as` cast below, rather than left as zod's inferred
// `{ id: string; [x: string]: unknown }`. That inferred type carries a string
// index signature, and TypeScript never considers a type WITHOUT an index
// signature -- e.g. the real `AdminUser` -- assignable to one that has one, no
// matter which properties are actually present. Left un-narrowed, the two-way
// assignability consts involving an embedded `user` fail to compile with a
// misleading "missing properties" error. See complaints' response-contracts.ts /
// task-4b-report.md for the full writeup of this gotcha.
type CoreEntityRef = { id: string }
const CoreEntitySchema = z.object({ id: z.string() }).passthrough() as unknown as z.ZodType<CoreEntityRef>

// ── Content Collection Fields ────────────────────────────────────────────────

export const AdminContentFieldSchema = z.strictObject({
	id: z.string(),
	name: z.string(),
	label: z.string(),
	field_type: z.string(),
	required: z.boolean(),
	options: z.record(z.string(), z.unknown()).nullable().optional(),
	default_value: z.unknown().optional(),
	sort_order: z.number(),
	content_collection_id: z.string().optional(),
	created_at: z.string(),
	updated_at: z.string()
})
const _fieldSchemaMatchesType: AdminContentField = {} as z.infer<typeof AdminContentFieldSchema>
const _fieldTypeMatchesSchema: z.infer<typeof AdminContentFieldSchema> = {} as AdminContentField

export const AdminContentCollectionFieldResponseSchema = z.strictObject({
	field: AdminContentFieldSchema
})
const _fieldResponseSchemaMatchesType: AdminContentCollectionFieldResponse = {} as z.infer<typeof AdminContentCollectionFieldResponseSchema>
const _fieldResponseTypeMatchesSchema: z.infer<typeof AdminContentCollectionFieldResponseSchema> = {} as AdminContentCollectionFieldResponse

export const AdminContentCollectionFieldsResponseSchema = z.strictObject({
	fields: z.array(AdminContentFieldSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _fieldsResponseSchemaMatchesType: AdminContentCollectionFieldsResponse = {} as z.infer<typeof AdminContentCollectionFieldsResponseSchema>
const _fieldsResponseTypeMatchesSchema: z.infer<typeof AdminContentCollectionFieldsResponseSchema> = {} as AdminContentCollectionFieldsResponse

// ── Content Collection Relationships ─────────────────────────────────────────

const contentRelationshipRefSchema = z.strictObject({ id: z.string(), label: z.string(), slug: z.string() })

export const AdminContentRelationshipSchema = z.strictObject({
	id: z.string(),
	relationship_type: z.enum(['many_to_many', 'one_to_many', 'many_to_one']),
	source_collection_id: z.string(),
	source_collection: contentRelationshipRefSchema,
	target_collection_id: z.string(),
	target_collection: contentRelationshipRefSchema,
	created_at: z.string(),
	updated_at: z.string()
})
const _relationshipSchemaMatchesType: AdminContentRelationship = {} as z.infer<typeof AdminContentRelationshipSchema>
const _relationshipTypeMatchesSchema: z.infer<typeof AdminContentRelationshipSchema> = {} as AdminContentRelationship

export const AdminContentCollectionRelationshipResponseSchema = z.strictObject({
	relationship: AdminContentRelationshipSchema
})
const _relationshipResponseSchemaMatchesType: AdminContentCollectionRelationshipResponse = {} as z.infer<
	typeof AdminContentCollectionRelationshipResponseSchema
>
const _relationshipResponseTypeMatchesSchema: z.infer<typeof AdminContentCollectionRelationshipResponseSchema> =
	{} as AdminContentCollectionRelationshipResponse

export const AdminContentCollectionRelationshipsResponseSchema = z.strictObject({
	relationships: z.array(AdminContentRelationshipSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _relationshipsResponseSchemaMatchesType: AdminContentCollectionRelationshipsResponse = {} as z.infer<
	typeof AdminContentCollectionRelationshipsResponseSchema
>
const _relationshipsResponseTypeMatchesSchema: z.infer<typeof AdminContentCollectionRelationshipsResponseSchema> =
	{} as AdminContentCollectionRelationshipsResponse

// ── Content Collections ───────────────────────────────────────────────────────

export const AdminContentCollectionSchema = z.strictObject({
	id: z.string(),
	label: z.string(),
	slug: z.string(),
	format: z.enum(['html', 'img', 'json', 'md', 'text']),
	prefix: z.string().nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	content_fields: z.array(AdminContentFieldSchema).optional(),
	source_relationships: z.array(AdminContentRelationshipSchema).optional(),
	target_relationships: z.array(AdminContentRelationshipSchema).optional(),
	created_at: z.string(),
	updated_at: z.string()
})
const _collectionSchemaMatchesType: AdminContentCollection = {} as z.infer<typeof AdminContentCollectionSchema>
const _collectionTypeMatchesSchema: z.infer<typeof AdminContentCollectionSchema> = {} as AdminContentCollection

export const AdminContentCollectionResponseSchema = z.strictObject({
	content_collection: AdminContentCollectionSchema
})
const _collectionResponseSchemaMatchesType: AdminContentCollectionResponse = {} as z.infer<typeof AdminContentCollectionResponseSchema>
const _collectionResponseTypeMatchesSchema: z.infer<typeof AdminContentCollectionResponseSchema> = {} as AdminContentCollectionResponse

export const AdminContentCollectionsResponseSchema = z.strictObject({
	content_collections: z.array(AdminContentCollectionSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _collectionsResponseSchemaMatchesType: AdminContentCollectionsResponse = {} as z.infer<typeof AdminContentCollectionsResponseSchema>
const _collectionsResponseTypeMatchesSchema: z.infer<typeof AdminContentCollectionsResponseSchema> = {} as AdminContentCollectionsResponse

// ── Content Creators ──────────────────────────────────────────────────────────

export const AdminContentCreatorSchema = z.strictObject({
	id: z.string(),
	name: z.string(),
	bio: z.string().nullable().optional(),
	avatar_url: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	created_at: z.string(),
	updated_at: z.string()
})
const _creatorSchemaMatchesType: AdminContentCreator = {} as z.infer<typeof AdminContentCreatorSchema>
const _creatorTypeMatchesSchema: z.infer<typeof AdminContentCreatorSchema> = {} as AdminContentCreator

export const AdminContentCreatorResponseSchema = z.strictObject({
	content_creator: AdminContentCreatorSchema
})
const _creatorResponseSchemaMatchesType: AdminContentCreatorResponse = {} as z.infer<typeof AdminContentCreatorResponseSchema>
const _creatorResponseTypeMatchesSchema: z.infer<typeof AdminContentCreatorResponseSchema> = {} as AdminContentCreatorResponse

export const AdminContentCreatorsResponseSchema = z.strictObject({
	content_creators: z.array(AdminContentCreatorSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _creatorsResponseSchemaMatchesType: AdminContentCreatorsResponse = {} as z.infer<typeof AdminContentCreatorsResponseSchema>
const _creatorsResponseTypeMatchesSchema: z.infer<typeof AdminContentCreatorsResponseSchema> = {} as AdminContentCreatorsResponse

// ── Content Tags ──────────────────────────────────────────────────────────────
//
// Same underlying `content_tag` entity, two different response shapes depending on
// which route served it -- see the module doc comment above.

// Item-scoped: `/admin/content/:collectionId/items/:itemId/tags` -- omits `item_id`.
export const AdminContentTagSchema = z.strictObject({
	id: z.string(),
	value: z.string(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	created_at: z.string(),
	updated_at: z.string()
})
const _tagSchemaMatchesType: AdminContentTag = {} as z.infer<typeof AdminContentTagSchema>
const _tagTypeMatchesSchema: z.infer<typeof AdminContentTagSchema> = {} as AdminContentTag

export const AdminContentItemTagsResponseSchema = z.strictObject({
	tags: z.array(AdminContentTagSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _itemTagsResponseSchemaMatchesType: AdminContentItemTagsResponse = {} as z.infer<typeof AdminContentItemTagsResponseSchema>
const _itemTagsResponseTypeMatchesSchema: z.infer<typeof AdminContentItemTagsResponseSchema> = {} as AdminContentItemTagsResponse

// `POST /admin/content/:collectionId/items/:itemId/tags` (add tag) -- the item-scoped
// shape (no `item_id`), NOT `AdminContentTagResponseSchema` below (which is bound to the
// standalone `/admin/content-tags` routes and does include `item_id`).
export const AdminContentItemTagResponseSchema = z.strictObject({
	tag: AdminContentTagSchema
})
const _itemTagResponseSchemaMatchesType: AdminContentItemTagResponse = {} as z.infer<typeof AdminContentItemTagResponseSchema>
const _itemTagResponseTypeMatchesSchema: z.infer<typeof AdminContentItemTagResponseSchema> = {} as AdminContentItemTagResponse

// Standalone: `/admin/content-tags[/:id]` -- includes `item_id`.
export const AdminContentTagWithItemSchema = AdminContentTagSchema.extend({
	item_id: z.string()
})
const _tagWithItemSchemaMatchesType: AdminContentTagWithItem = {} as z.infer<typeof AdminContentTagWithItemSchema>
const _tagWithItemTypeMatchesSchema: z.infer<typeof AdminContentTagWithItemSchema> = {} as AdminContentTagWithItem

export const AdminContentTagResponseSchema = z.strictObject({
	content_tag: AdminContentTagWithItemSchema
})
const _tagResponseSchemaMatchesType: AdminContentTagResponse = {} as z.infer<typeof AdminContentTagResponseSchema>
const _tagResponseTypeMatchesSchema: z.infer<typeof AdminContentTagResponseSchema> = {} as AdminContentTagResponse

export const AdminContentTagsResponseSchema = z.strictObject({
	content_tags: z.array(AdminContentTagWithItemSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _tagsResponseSchemaMatchesType: AdminContentTagsResponse = {} as z.infer<typeof AdminContentTagsResponseSchema>
const _tagsResponseTypeMatchesSchema: z.infer<typeof AdminContentTagsResponseSchema> = {} as AdminContentTagsResponse

// ── Content Item Activity ────────────────────────────────────────────────────

export const AdminContentItemActivitySchema = z.strictObject({
	id: z.string(),
	type: z.enum(['publish', 'archive', 'draft', 'edit', 'note']),
	user_id: z.string(),
	note: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	created_at: z.string(),
	updated_at: z.string(),
	user: CoreEntitySchema.optional()
})
// `user` is a core entity (AdminUser) -- reduced to CoreEntityRef, see above.
type AdminContentItemActivityContract = Omit<AdminContentItemActivity, 'user'> & { user?: CoreEntityRef }
const _itemActivitySchemaMatchesType: AdminContentItemActivityContract = {} as z.infer<typeof AdminContentItemActivitySchema>
const _itemActivityTypeMatchesSchema: z.infer<typeof AdminContentItemActivitySchema> = {} as AdminContentItemActivityContract

export const AdminContentItemActivityResponseSchema = z.strictObject({
	activity: z.array(AdminContentItemActivitySchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
type AdminContentItemActivityResponseContract = Omit<AdminContentItemActivityResponse, 'activity'> & { activity: AdminContentItemActivityContract[] }
const _itemActivityResponseSchemaMatchesType: AdminContentItemActivityResponseContract = {} as z.infer<typeof AdminContentItemActivityResponseSchema>
const _itemActivityResponseTypeMatchesSchema: z.infer<typeof AdminContentItemActivityResponseSchema> = {} as AdminContentItemActivityResponseContract

// `POST /admin/content/:collectionId/items/:itemId/activity` (create) -- no GET-detail
// route exists for a single activity entry, so this reuses the list route's per-entry
// projection wrapped singularly under `entry` (the route's existing response key).
export const AdminContentItemActivityEntryResponseSchema = z.strictObject({
	entry: AdminContentItemActivitySchema
})
type AdminContentItemActivityEntryResponseContract = Omit<AdminContentItemActivityEntryResponse, 'entry'> & { entry: AdminContentItemActivityContract }
const _itemActivityEntryResponseSchemaMatchesType: AdminContentItemActivityEntryResponseContract = {} as z.infer<
	typeof AdminContentItemActivityEntryResponseSchema
>
const _itemActivityEntryResponseTypeMatchesSchema: z.infer<typeof AdminContentItemActivityEntryResponseSchema> =
	{} as AdminContentItemActivityEntryResponseContract

// ── Content Creator Activity ─────────────────────────────────────────────────

export const AdminContentCreatorActivitySchema = z.strictObject({
	id: z.string(),
	type: z.enum(['edit', 'note']),
	user_id: z.string(),
	note: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	created_at: z.string(),
	updated_at: z.string(),
	user: CoreEntitySchema.optional()
})
type AdminContentCreatorActivityContract = Omit<AdminContentCreatorActivity, 'user'> & { user?: CoreEntityRef }
const _creatorActivitySchemaMatchesType: AdminContentCreatorActivityContract = {} as z.infer<typeof AdminContentCreatorActivitySchema>
const _creatorActivityTypeMatchesSchema: z.infer<typeof AdminContentCreatorActivitySchema> = {} as AdminContentCreatorActivityContract

export const AdminContentCreatorActivityResponseSchema = z.strictObject({
	activity: z.array(AdminContentCreatorActivitySchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
type AdminContentCreatorActivityResponseContract = Omit<AdminContentCreatorActivityResponse, 'activity'> & {
	activity: AdminContentCreatorActivityContract[]
}
const _creatorActivityResponseSchemaMatchesType: AdminContentCreatorActivityResponseContract = {} as z.infer<typeof AdminContentCreatorActivityResponseSchema>
const _creatorActivityResponseTypeMatchesSchema: z.infer<typeof AdminContentCreatorActivityResponseSchema> = {} as AdminContentCreatorActivityResponseContract

// `POST /admin/content-creators/:id/activity` (create) -- no GET-detail route exists for a
// single activity entry, so this reuses the list route's per-entry projection wrapped
// singularly under `entry` (the route's existing response key).
export const AdminContentCreatorActivityEntryResponseSchema = z.strictObject({
	entry: AdminContentCreatorActivitySchema
})
type AdminContentCreatorActivityEntryResponseContract = Omit<AdminContentCreatorActivityEntryResponse, 'entry'> & { entry: AdminContentCreatorActivityContract }
const _creatorActivityEntryResponseSchemaMatchesType: AdminContentCreatorActivityEntryResponseContract = {} as z.infer<
	typeof AdminContentCreatorActivityEntryResponseSchema
>
const _creatorActivityEntryResponseTypeMatchesSchema: z.infer<typeof AdminContentCreatorActivityEntryResponseSchema> =
	{} as AdminContentCreatorActivityEntryResponseContract

// ── Content Item Links ───────────────────────────────────────────────────────

export const AdminContentItemLinkSchema = z.strictObject({
	id: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	source_item: z.strictObject({ id: z.string(), title: z.string(), slug: z.string() }),
	target_item: z.strictObject({ id: z.string(), title: z.string(), slug: z.string() }),
	relationship: z.strictObject({ id: z.string(), relationship_type: z.enum(['many_to_many', 'one_to_many', 'many_to_one']) })
})
const _linkSchemaMatchesType: AdminContentItemLink = {} as z.infer<typeof AdminContentItemLinkSchema>
const _linkTypeMatchesSchema: z.infer<typeof AdminContentItemLinkSchema> = {} as AdminContentItemLink

export const AdminContentItemLinksResponseSchema = z.strictObject({
	links: z.array(AdminContentItemLinkSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _linksResponseSchemaMatchesType: AdminContentItemLinksResponse = {} as z.infer<typeof AdminContentItemLinksResponseSchema>
const _linksResponseTypeMatchesSchema: z.infer<typeof AdminContentItemLinksResponseSchema> = {} as AdminContentItemLinksResponse

// `POST /admin/content/:collectionId/items/:itemId/links` (create) -- no GET-detail route
// exists for a single link, so this reuses the list route's per-link projection
// (`AdminContentItemLinkSchema`) wrapped singularly. The route re-fetches via `query.graph`
// with the same field selection the list route uses, rather than returning the raw created
// `content_link` entity (which would carry `source_item_id`/`target_item_id`/
// `relationship_id` scalars and `deleted_at` instead of the nested objects the type declares).
export const AdminContentItemLinkResponseSchema = z.strictObject({
	link: AdminContentItemLinkSchema
})
const _linkResponseSchemaMatchesType: AdminContentItemLinkResponse = {} as z.infer<typeof AdminContentItemLinkResponseSchema>
const _linkResponseTypeMatchesSchema: z.infer<typeof AdminContentItemLinkResponseSchema> = {} as AdminContentItemLinkResponse

// ── Content Items ─────────────────────────────────────────────────────────────
//
// `AdminContentItem.content_collection` / `.creator` / `.tags` are typed against the
// FULL `AdminContentCollection` / `AdminContentCreator` / `AdminContentTag` shapes,
// but neither the list nor the detail route actually selects that much -- and the
// two routes don't even select the same subset as each other. Modelled as two
// schemas, each checked against a locally narrowed "Contract" alias rather than
// `AdminContentItem` directly (same technique as `CoreEntityRef` above, applied to a
// plugin-owned partial projection instead of a core entity).

const itemTagRefSchema = z.strictObject({
	id: z.string(),
	value: z.string(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
type ItemTagRef = Pick<AdminContentTag, 'id' | 'value' | 'metadata'>

// `/admin/content/:collectionId/items` (list)
export const AdminContentItemListSchema = z.strictObject({
	id: z.string(),
	title: z.string(),
	slug: z.string(),
	body: z.string().nullable(),
	status: z.enum(['draft', 'published', 'archived']),
	published_at: z.string().nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	content_collection_id: z.string(),
	content_collection: z.strictObject({ id: z.string(), label: z.string(), slug: z.string() }).optional(),
	creator: z.strictObject({ id: z.string(), name: z.string() }).nullable().optional(),
	tags: z.array(itemTagRefSchema).optional(),
	created_at: z.string(),
	updated_at: z.string()
})
type ItemListContentCollectionRef = Pick<AdminContentCollection, 'id' | 'label' | 'slug'>
type ItemListCreatorRef = Pick<AdminContentCreator, 'id' | 'name'>
type AdminContentItemListContract = Omit<AdminContentItem, 'content_collection' | 'creator' | 'tags'> & {
	content_collection?: ItemListContentCollectionRef
	creator?: ItemListCreatorRef | null
	tags?: ItemTagRef[]
}
const _itemListSchemaMatchesType: AdminContentItemListContract = {} as z.infer<typeof AdminContentItemListSchema>
const _itemListTypeMatchesSchema: z.infer<typeof AdminContentItemListSchema> = {} as AdminContentItemListContract

export const AdminContentItemsResponseSchema = z.strictObject({
	content_items: z.array(AdminContentItemListSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
type AdminContentItemsResponseContract = Omit<AdminContentItemsResponse, 'content_items'> & { content_items: AdminContentItemListContract[] }
const _itemsResponseSchemaMatchesType: AdminContentItemsResponseContract = {} as z.infer<typeof AdminContentItemsResponseSchema>
const _itemsResponseTypeMatchesSchema: z.infer<typeof AdminContentItemsResponseSchema> = {} as AdminContentItemsResponseContract

// `/admin/content/:collectionId/items/:itemId` (detail)
const itemDetailContentFieldSchema = z.strictObject({
	id: z.string(),
	name: z.string(),
	label: z.string(),
	field_type: z.string(),
	required: z.boolean(),
	options: z.record(z.string(), z.unknown()).nullable().optional(),
	sort_order: z.number()
})
type ItemDetailContentFieldRef = Pick<AdminContentField, 'id' | 'name' | 'label' | 'field_type' | 'required' | 'options' | 'sort_order'>

export const AdminContentItemDetailSchema = z.strictObject({
	id: z.string(),
	title: z.string(),
	slug: z.string(),
	body: z.string().nullable(),
	status: z.enum(['draft', 'published', 'archived']),
	published_at: z.string().nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	content_collection_id: z.string(),
	content_collection: z
		.strictObject({
			id: z.string(),
			label: z.string(),
			slug: z.string(),
			format: z.enum(['html', 'img', 'json', 'md', 'text']),
			content_fields: z.array(itemDetailContentFieldSchema).optional()
		})
		.optional(),
	creator: z
		.strictObject({
			id: z.string(),
			name: z.string(),
			bio: z.string().nullable().optional(),
			avatar_url: z.string().nullable().optional()
		})
		.nullable()
		.optional(),
	tags: z.array(itemTagRefSchema).optional(),
	created_at: z.string(),
	updated_at: z.string()
})
type ItemDetailContentCollectionRef = Pick<AdminContentCollection, 'id' | 'label' | 'slug' | 'format'> & {
	content_fields?: ItemDetailContentFieldRef[]
}
type ItemDetailCreatorRef = Pick<AdminContentCreator, 'id' | 'name' | 'bio' | 'avatar_url'>
type AdminContentItemDetailContract = Omit<AdminContentItem, 'content_collection' | 'creator' | 'tags'> & {
	content_collection?: ItemDetailContentCollectionRef
	creator?: ItemDetailCreatorRef | null
	tags?: ItemTagRef[]
}
const _itemDetailSchemaMatchesType: AdminContentItemDetailContract = {} as z.infer<typeof AdminContentItemDetailSchema>
const _itemDetailTypeMatchesSchema: z.infer<typeof AdminContentItemDetailSchema> = {} as AdminContentItemDetailContract

export const AdminContentItemResponseSchema = z.strictObject({
	content_item: AdminContentItemDetailSchema
})
type AdminContentItemResponseContract = Omit<AdminContentItemResponse, 'content_item'> & { content_item: AdminContentItemDetailContract }
const _itemResponseSchemaMatchesType: AdminContentItemResponseContract = {} as z.infer<typeof AdminContentItemResponseSchema>
const _itemResponseTypeMatchesSchema: z.infer<typeof AdminContentItemResponseSchema> = {} as AdminContentItemResponseContract

// ── Content Upload (image/media surface) ─────────────────────────────────────
//
// Not a `MedusaService` entity -- `uploadFilesWithPrefixWorkflow` returns whatever
// the configured file provider's `upload()` method returns (`{ url, key }` per
// file), so there's no ORM/`deleted_at` leak risk here and this route's response
// is safe to assert with `z.strictObject` same as any GET.

export const AdminContentUploadResponseSchema = z.strictObject({
	files: z.array(
		z.strictObject({
			url: z.string(),
			key: z.string()
		})
	)
})
const _uploadResponseSchemaMatchesType: AdminContentUploadResponse = {} as z.infer<typeof AdminContentUploadResponseSchema>
const _uploadResponseTypeMatchesSchema: z.infer<typeof AdminContentUploadResponseSchema> = {} as AdminContentUploadResponse

// ── Store (public) content routes ────────────────────────────────────────────
//
// Bonus coverage: `content.spec.ts` also exercises the four public `/content*`
// routes at length (collections, items, caching, opt-in markdown rendering), and
// they're this plugin's own contract too, not core Medusa's. But nothing in this
// repo's admin dashboard consumes them (they're meant for an external storefront),
// so there's no hand-written TS type to reconcile against and therefore no
// two-way assignability consts here -- schema-only, `.parse()`-only.

export const StoreContentCollectionSchema = z.strictObject({
	id: z.string(),
	label: z.string(),
	slug: z.string(),
	format: z.enum(['html', 'img', 'json', 'md', 'text']),
	prefix: z.string().nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})

export const StoreContentCollectionsResponseSchema = z.strictObject({
	content_collections: z.array(StoreContentCollectionSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})

export const StoreContentCollectionDetailSchema = StoreContentCollectionSchema.extend({
	content_fields: z
		.array(
			z.strictObject({
				id: z.string(),
				name: z.string(),
				label: z.string(),
				field_type: z.string(),
				sort_order: z.number()
			})
		)
		.optional()
})

export const StoreContentCollectionResponseSchema = z.strictObject({
	content_collection: StoreContentCollectionDetailSchema
})

const storeItemTagRefSchema = z.strictObject({ id: z.string(), value: z.string() })

export const StoreContentItemListSchema = z.strictObject({
	id: z.string(),
	title: z.string(),
	slug: z.string(),
	body: z.string().nullable(),
	status: z.enum(['draft', 'published', 'archived']),
	published_at: z.string().nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	created_at: z.string(),
	// Auto-included by Medusa's query.graph whenever `content_collection.*` is
	// requested (the owning side's FK column comes along for free) -- confirmed
	// empirically, not declared in `req.queryConfig`. See module doc comment /
	// task-4c-content-report.md.
	content_collection_id: z.string(),
	content_collection: z.strictObject({ id: z.string(), label: z.string(), slug: z.string() }).optional(),
	creator: z.strictObject({ id: z.string(), name: z.string() }).nullable().optional(),
	tags: z.array(storeItemTagRefSchema).optional()
})

export const StoreContentItemsResponseSchema = z.strictObject({
	content_items: z.array(StoreContentItemListSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})

export const StoreContentItemDetailSchema = z.strictObject({
	id: z.string(),
	title: z.string(),
	slug: z.string(),
	body: z.string().nullable(),
	status: z.enum(['draft', 'published', 'archived']),
	published_at: z.string().nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	created_at: z.string(),
	// Auto-included by Medusa's query.graph whenever `content_collection.*` is
	// requested -- see StoreContentItemListSchema above.
	content_collection_id: z.string(),
	content_collection: z
		.strictObject({
			id: z.string(),
			label: z.string(),
			slug: z.string(),
			format: z.enum(['html', 'img', 'json', 'md', 'text']),
			content_fields: z
				.array(
					z.strictObject({
						id: z.string(),
						name: z.string(),
						label: z.string(),
						field_type: z.string(),
						sort_order: z.number()
					})
				)
				.optional()
		})
		.optional(),
	creator: z
		.strictObject({
			id: z.string(),
			name: z.string(),
			bio: z.string().nullable().optional(),
			avatar_url: z.string().nullable().optional()
		})
		.nullable()
		.optional(),
	tags: z.array(z.strictObject({ id: z.string(), value: z.string(), metadata: z.record(z.string(), z.unknown()).nullable().optional() })).optional(),
	// Only present when `?render=html` is requested on a markdown-format item -- see
	// `src/api/content/[slug]/items/[itemSlug]/route.ts`.
	body_html: z.string().optional()
})

export const StoreContentItemResponseSchema = z.strictObject({
	content_item: StoreContentItemDetailSchema
})
