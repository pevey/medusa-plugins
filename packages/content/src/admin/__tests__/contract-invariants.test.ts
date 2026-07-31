import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('content admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				declaredFields: {
					// Content collections list (src/admin/routes/content/page.tsx) + the format-filtered
					// consumers of the same route (images/page.tsx, library-image-picker-modal.tsx,
					// insert-image-modal.tsx, both fetching with `{ limit: 100 }` to build an in-memory
					// "img format" collection picker) all read only these fields, plus id.
					'GET /admin/content': ['id', 'label', 'format', 'slug', 'prefix'],
					// Collection detail page + EditContentCollectionDrawer. `allRelationships` in the
					// detail page concatenates source_relationships and target_relationships and reads
					// the SAME shape off either array's entries (id, relationship_type,
					// source_collection_id for the isSource check, then whichever of source_collection /
					// target_collection is "the other side") -- so both prefixes need both nested
					// collection refs declared, not just their own natural side.
					'GET /admin/content/:collectionId': [
						'id',
						'label',
						'slug',
						'prefix',
						'format',
						'content_fields.id',
						'content_fields.name',
						'content_fields.label',
						'content_fields.field_type',
						'content_fields.required',
						'content_fields.sort_order',
						'source_relationships.id',
						'source_relationships.relationship_type',
						'source_relationships.source_collection_id',
						'source_relationships.source_collection.id',
						'source_relationships.source_collection.label',
						'source_relationships.target_collection.id',
						'source_relationships.target_collection.label',
						'target_relationships.id',
						'target_relationships.relationship_type',
						'target_relationships.source_collection_id',
						'target_relationships.source_collection.id',
						'target_relationships.source_collection.label',
						'target_relationships.target_collection.id',
						'target_relationships.target_collection.label'
					],
					// Items list page (table + gallery view for `img`-format collections), the standalone
					// Image Gallery page, and both image-picker modals -- all consumers of this route read
					// only these fields off each item, plus id.
					'GET /admin/content/:collectionId/items': ['id', 'title', 'slug', 'status', 'published_at', 'body'],
					// Item editor page + EditContentItemDrawer. `content_collection_id` (the flat FK) is
					// read directly by the drawer (`useUpdateContentItem(item.content_collection_id,
					// item.id)`) -- it was missing from this route's `defaults` until this task (see
					// `ITEM_DETAIL_FIELDS` in middlewares.ts): every fetched item's `content_collection_id`
					// was silently `undefined`, so every edit-drawer save posted to
					// `/admin/content/undefined/items/:itemId` and failed. Fixed by adding it to defaults.
					'GET /admin/content/:collectionId/items/:itemId': [
						'id',
						'content_collection_id',
						'title',
						'slug',
						'body',
						'status',
						'published_at',
						'metadata',
						'content_collection.format',
						'content_collection.content_fields.id',
						'content_collection.content_fields.name',
						'content_collection.content_fields.label',
						'content_collection.content_fields.field_type',
						'content_collection.content_fields.required',
						'content_collection.content_fields.options',
						'content_collection.content_fields.sort_order'
					]
					// No admin UI page/hook calls any of: GET /admin/content/:collectionId/fields[/:fieldId],
					// GET /admin/content/:collectionId/relationships[/:relId],
					// GET /admin/content/:collectionId/items/:itemId/{activity,links,tags},
					// GET /admin/content-creators[/:id[/activity]], GET /admin/content-tags[/:id] -- the
					// admin UI never fetches item activity/links/tags, creators, or the standalone tags
					// endpoint (fields/relationships are only ever read nested through the collection
					// detail route above). No declaredFields entries for any of them, per the brief's
					// "don't manufacture entries" guidance. See the task report for the larger admin UI
					// coverage gap this reveals (content-creators and content-tags have API routes but no
					// admin pages at all).
				}
			})
		).not.toThrow()
	})
})
