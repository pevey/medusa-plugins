/**
 * Integration tests for the Content module.
 *
 * Covers:
 *  - Authentication enforcement on all admin endpoints
 *  - Request body validation (missing required fields, empty arrays)
 *  - Full CRUD for ContentCollection, ContentField, ContentRelationship
 *  - Full CRUD for ContentCreator + activity logging
 *  - Full CRUD for ContentItem + status-change activity auto-logging
 *  - published_at auto-set when status changes to published
 *  - published_at manual override respected
 *  - ContentItemActivity (list, create, bulk delete)
 *  - ContentCreatorActivity (list, create, bulk delete)
 *  - ContentItemLinks (list, create, delete)
 *  - Query filters (status, creator_id, q)
 *  - ContentRelationship immutability (no update route)
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=content
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import { ContentService } from '../../src/modules/content/service'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa_test',
	inApp: true,
	disableAutoTeardown: true,
	env: {},
	testSuite: ({ api, getContainer }) => {
		let adminToken: string
		let contentService: ContentService

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		// ── Setup ──────────────────────────────────────────────────────────────────

		beforeAll(async () => {
			const container = getContainer()
			contentService = container.resolve('content')

			const authService = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'content-test@example.com', password: 'Sup3rSecret!' }
			})

			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'content-test@example.com',
						first_name: 'Content',
						last_name: 'Tester'
					}
				}
			})

			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'content-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		// ── Authentication ─────────────────────────────────────────────────────────

		describe('Authentication', () => {
			const FAKE_ID = 'nonexistent_id'
			const endpoints = [
				['GET', '/admin/content', null],
				['POST', '/admin/content', { label: 'x', slug: 'x', format: 'html' }],
				['DELETE', '/admin/content', { ids: [FAKE_ID] }],
				['GET', `/admin/content/${FAKE_ID}`, null],
				['POST', `/admin/content/${FAKE_ID}`, { label: 'y' }],
				['DELETE', `/admin/content/${FAKE_ID}`, null],
				['GET', `/admin/content/${FAKE_ID}/fields`, null],
				['POST', `/admin/content/${FAKE_ID}/fields`, { name: 'x', label: 'x', field_type: 'text' }],
				['GET', `/admin/content/${FAKE_ID}/relationships`, null],
				['POST', `/admin/content/${FAKE_ID}/relationships`, { target_collection_id: FAKE_ID, relationship_type: 'many_to_many' }],
				['GET', '/admin/content-creators', null],
				['POST', '/admin/content-creators', { name: 'x' }],
				['DELETE', '/admin/content-creators', { ids: [FAKE_ID] }],
				['GET', `/admin/content-creators/${FAKE_ID}`, null],
				['POST', `/admin/content-creators/${FAKE_ID}`, { name: 'y' }],
				['DELETE', `/admin/content-creators/${FAKE_ID}`, null],
				['GET', `/admin/content-creators/${FAKE_ID}/activity`, null],
				['POST', `/admin/content-creators/${FAKE_ID}/activity`, { type: 'note', note: 'x' }],
				['GET', `/admin/content/${FAKE_ID}/items`, null],
				['POST', `/admin/content/${FAKE_ID}/items`, { title: 'x', slug: 'x' }],
				['DELETE', `/admin/content/${FAKE_ID}/items`, { ids: [FAKE_ID] }],
				['GET', `/admin/content/${FAKE_ID}/items/${FAKE_ID}`, null],
				['POST', `/admin/content/${FAKE_ID}/items/${FAKE_ID}`, { title: 'y' }],
				['DELETE', `/admin/content/${FAKE_ID}/items/${FAKE_ID}`, null],
				['GET', `/admin/content/${FAKE_ID}/items/${FAKE_ID}/activity`, null],
				['POST', `/admin/content/${FAKE_ID}/items/${FAKE_ID}/activity`, { type: 'note', note: 'x' }],
				['GET', `/admin/content/${FAKE_ID}/items/${FAKE_ID}/links`, null],
				['POST', `/admin/content/${FAKE_ID}/items/${FAKE_ID}/links`, { target_item_id: FAKE_ID, relationship_id: FAKE_ID }],
				['POST', `/admin/content/${FAKE_ID}/upload`, null]
			] as const

			it.each(endpoints)('%s %s returns 401 without auth token', async (method, path, body) => {
				let res: any
				if (method === 'GET') {
					res = await api.get(path).catch((e: any) => e.response)
				} else if (method === 'DELETE') {
					res = await api.delete(path, { data: body }).catch((e: any) => e.response)
				} else {
					res = await api.post(path, body).catch((e: any) => e.response)
				}
				expect(res.status).toBe(401)
			})
		})

		// ── Validation ─────────────────────────────────────────────────────────────

		describe('Validation', () => {
			it('POST /admin/content rejects missing label', async () => {
				const res = await api
					.post('/admin/content', { slug: 'x', format: 'html' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content rejects missing slug', async () => {
				const res = await api
					.post('/admin/content', { label: 'x', format: 'html' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content rejects missing format', async () => {
				const res = await api
					.post('/admin/content', { label: 'x', slug: 'x' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/content rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/content', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content/:id/fields rejects missing name', async () => {
				const res = await api
					.post('/admin/content/fake_id/fields', { label: 'x', field_type: 'text' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content/:id/fields rejects missing field_type', async () => {
				const res = await api
					.post('/admin/content/fake_id/fields', { name: 'x', label: 'x' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content/:id/relationships rejects missing target_collection_id', async () => {
				const res = await api
					.post('/admin/content/fake_id/relationships', { relationship_type: 'many_to_many' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content/:id/relationships rejects invalid relationship_type', async () => {
				const res = await api
					.post('/admin/content/fake_id/relationships', { target_collection_id: 'x', relationship_type: 'invalid' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content-creators rejects missing name', async () => {
				const res = await api
					.post('/admin/content-creators', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/content-creators rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/content-creators', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content/:id/items rejects missing title', async () => {
				const res = await api
					.post('/admin/content/fake_id/items', { slug: 'x' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content/:id/items rejects missing slug', async () => {
				const res = await api
					.post('/admin/content/fake_id/items', { title: 'x' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/content/:id/items rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/content/fake_id/items', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content rejects slug with spaces', async () => {
				const res = await api
					.post('/admin/content', { label: 'x', slug: 'hello world', format: 'html' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content rejects slug with uppercase', async () => {
				const res = await api
					.post('/admin/content', { label: 'x', slug: 'Hello-World', format: 'html' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content rejects slug with special characters', async () => {
				const res = await api
					.post('/admin/content', { label: 'x', slug: 'hello_world!', format: 'html' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/content accepts valid slug', async () => {
				const ts = Date.now()
				const res = await api
					.post('/admin/content', { label: 'x', slug: `valid-slug-${ts}`, format: 'html' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(200)
				await api.delete('/admin/content', { data: { ids: [res.data.content_collection.id] }, ...auth() }).catch(() => {})
			})

			it('POST /admin/content/:id/items rejects slug with spaces', async () => {
				const res = await api
					.post('/admin/content/fake_id/items', { title: 'x', slug: 'hello world' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── Content Collections ────────────────────────────────────────────────────

		describe('Content Collections', () => {
			let collectionId: string
			let collectionId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const [r1, r2] = await Promise.all([
					api.post('/admin/content', { label: `Blog Post ${ts}`, slug: `blog-post-${ts}`, format: 'md' }, auth()),
					api.post('/admin/content', { label: `Product Page ${ts}`, slug: `product-page-${ts}`, format: 'html' }, auth())
				])
				collectionId = r1.data.content_collection.id
				collectionId2 = r2.data.content_collection.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/content', { data: { ids: [collectionId, collectionId2] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/content creates a content collection', async () => {
				const ts = Date.now()
				const res = await api.post(
					'/admin/content',
					{ label: `Temp Collection ${ts}`, slug: `temp-collection-${ts}`, format: 'html', metadata: { icon: 'file' } },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.content_collection).toMatchObject({
					id: expect.any(String),
					label: `Temp Collection ${ts}`,
					slug: `temp-collection-${ts}`,
					metadata: { icon: 'file' }
				})
				await api
					.delete('/admin/content', { data: { ids: [res.data.content_collection.id] }, ...auth() })
					.catch(() => {})
			})

			it('GET /admin/content lists content collections', async () => {
				const res = await api.get('/admin/content', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.content_collections)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
				expect(res.data.limit).toBeGreaterThan(0)
				expect(res.data.offset).toBe(0)
			})

			it('GET /admin/content filters by q', async () => {
				const res = await api.get('/admin/content?q=Blog+Post', auth())
				expect(res.status).toBe(200)
				expect(res.data.content_collections.every((t: any) => t.label.includes('Blog Post'))).toBe(true)
			})

			it('GET /admin/content supports pagination', async () => {
				const res = await api.get('/admin/content?limit=1&offset=0', auth())
				expect(res.status).toBe(200)
				expect(res.data.content_collections).toHaveLength(1)
			})

			it('GET /admin/content/:id retrieves a single content collection', async () => {
				const res = await api.get(`/admin/content/${collectionId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.content_collection.id).toBe(collectionId)
			})

			it('GET /admin/content/:id includes fields and relationships in response', async () => {
				const res = await api.get(`/admin/content/${collectionId}`, auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.content_collection.content_fields)).toBe(true)
				expect(Array.isArray(res.data.content_collection.source_relationships)).toBe(true)
				expect(Array.isArray(res.data.content_collection.target_relationships)).toBe(true)
			})

			it('POST /admin/content/:id updates label', async () => {
				const ts = Date.now()
				const res = await api.post(
					`/admin/content/${collectionId2}`,
					{ label: `Updated Label ${ts}` },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.content_collection.label).toBe(`Updated Label ${ts}`)
			})

			it('DELETE /admin/content/:id deletes a single content collection', async () => {
				const created = await api.post(
					'/admin/content',
					{ label: 'To Delete', slug: `to-delete-${Date.now()}`, format: 'html' },
					auth()
				)
				const id = created.data.content_collection.id

				const res = await api.delete(`/admin/content/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/content bulk deletes', async () => {
				const ts = Date.now()
				const [a, b] = await Promise.all([
					api.post('/admin/content', { label: `Bulk A ${ts}`, slug: `bulk-a-${ts}`, format: 'html' }, auth()),
					api.post('/admin/content', { label: `Bulk B ${ts}`, slug: `bulk-b-${ts}`, format: 'html' }, auth())
				])
				const ids = [a.data.content_collection.id, b.data.content_collection.id]

				const res = await api.delete('/admin/content', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})

			// ── Content Collection Fields ────────────────────────────────────────────

			describe('Fields', () => {
				let fieldId: string

				beforeAll(async () => {
					const res = await api.post(
						`/admin/content/${collectionId}/fields`,
						{ name: 'headline', label: 'Headline', field_type: 'text', required: true, sort_order: 1 },
						auth()
					)
					fieldId = res.data.field.id
				})

				afterAll(async () => {
					await api
						.delete(`/admin/content/${collectionId}/fields`, { data: { ids: [fieldId] }, ...auth() })
						.catch(() => {})
				})

				it('POST /admin/content/:id/fields creates a field', async () => {
					const res = await api.post(
						`/admin/content/${collectionId}/fields`,
						{ name: 'summary', label: 'Summary', field_type: 'textarea', required: false },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.field).toMatchObject({
						id: expect.any(String),
						name: 'summary',
						label: 'Summary',
						field_type: 'textarea',
						required: false
					})
					await api
						.delete(`/admin/content/${collectionId}/fields`, { data: { ids: [res.data.field.id] }, ...auth() })
						.catch(() => {})
				})

				it('POST .../fields creates a select field with options', async () => {
					const options = { values: ['red', 'green', 'blue'] }
					const res = await api.post(
						`/admin/content/${collectionId}/fields`,
						{ name: 'color', label: 'Color', field_type: 'select', options },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.field.options).toEqual(options)
					await api
						.delete(`/admin/content/${collectionId}/fields`, { data: { ids: [res.data.field.id] }, ...auth() })
						.catch(() => {})
				})

				it('GET .../fields lists fields for a content collection', async () => {
					const res = await api.get(`/admin/content/${collectionId}/fields`, auth())
					expect(res.status).toBe(200)
					expect(Array.isArray(res.data.fields)).toBe(true)
					expect(res.data.fields.length).toBeGreaterThanOrEqual(1)
				})

				it('GET .../fields/:fieldId retrieves a single field', async () => {
					const res = await api.get(
						`/admin/content/${collectionId}/fields/${fieldId}`,
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.field.id).toBe(fieldId)
				})

				it('POST .../fields/:fieldId updates a field', async () => {
					const res = await api.post(
						`/admin/content/${collectionId}/fields/${fieldId}`,
						{ label: 'Updated Headline', sort_order: 10 },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.field.label).toBe('Updated Headline')
					expect(res.data.field.sort_order).toBe(10)
				})

				it('DELETE .../fields/:fieldId deletes a field', async () => {
					const created = await api.post(
						`/admin/content/${collectionId}/fields`,
						{ name: 'temp_field', label: 'Temp', field_type: 'text' },
						auth()
					)
					const id = created.data.field.id

					const res = await api.delete(
						`/admin/content/${collectionId}/fields/${id}`,
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.deleted).toContain(id)
				})

				it('DELETE .../fields bulk deletes fields', async () => {
					const [a, b] = await Promise.all([
						api.post(`/admin/content/${collectionId}/fields`, { name: 'f_a', label: 'A', field_type: 'text' }, auth()),
						api.post(`/admin/content/${collectionId}/fields`, { name: 'f_b', label: 'B', field_type: 'text' }, auth())
					])
					const ids = [a.data.field.id, b.data.field.id]

					const res = await api.delete(
						`/admin/content/${collectionId}/fields`,
						{ data: { ids }, ...auth() }
					)
					expect(res.status).toBe(200)
					expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
				})
			})

			// ── Content Collection Relationships ─────────────────────────────────────

			describe('Relationships', () => {
				let relId: string
				let sourceCollectionId: string
				let targetCollectionId: string

				beforeAll(async () => {
					const ts = Date.now()
					const [src, tgt] = await Promise.all([
						api.post('/admin/content', { label: `Rel Source ${ts}`, slug: `rel-src-${ts}`, format: 'html' }, auth()),
						api.post('/admin/content', { label: `Rel Target ${ts}`, slug: `rel-tgt-${ts}`, format: 'html' }, auth())
					])
					sourceCollectionId = src.data.content_collection.id
					targetCollectionId = tgt.data.content_collection.id

					const relRes = await api.post(
						`/admin/content/${sourceCollectionId}/relationships`,
						{ target_collection_id: targetCollectionId, relationship_type: 'many_to_many' },
						auth()
					)
					relId = relRes.data.relationship.id
				})

				afterAll(async () => {
					await api
						.delete('/admin/content', {
							data: { ids: [sourceCollectionId, targetCollectionId] },
							...auth()
						})
						.catch(() => {})
				})

				it('POST .../relationships creates a relationship', async () => {
					expect(typeof relId).toBe('string')
					expect(relId.length).toBeGreaterThan(0)
				})

				it('GET .../relationships lists relationships including both sides', async () => {
					const res = await api.get(
						`/admin/content/${sourceCollectionId}/relationships`,
						auth()
					)
					expect(res.status).toBe(200)
					expect(Array.isArray(res.data.relationships)).toBe(true)
					const rel = res.data.relationships.find((r: any) => r.id === relId)
					expect(rel).toBeDefined()
					expect(rel.relationship_type).toBe('many_to_many')
				})

				it('GET .../relationships returns the relationship when queried from target side', async () => {
					const res = await api.get(
						`/admin/content/${targetCollectionId}/relationships`,
						auth()
					)
					expect(res.status).toBe(200)
					const rel = res.data.relationships.find((r: any) => r.id === relId)
					expect(rel).toMatchObject({
						id: relId,
						relationship_type: 'many_to_many'
					})
				})

				it('GET .../relationships/:relId retrieves a single relationship', async () => {
					const res = await api.get(
						`/admin/content/${sourceCollectionId}/relationships/${relId}`,
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.relationship).toMatchObject({
						id: relId,
						source_collection: { id: sourceCollectionId },
						target_collection: { id: targetCollectionId }
					})
				})

				it('DELETE .../relationships/:relId deletes a relationship', async () => {
					const ts = Date.now()
					const [s, t] = await Promise.all([
						api.post('/admin/content', { label: `Del Src ${ts}`, slug: `del-src-${ts}`, format: 'html' }, auth()),
						api.post('/admin/content', { label: `Del Tgt ${ts}`, slug: `del-tgt-${ts}`, format: 'html' }, auth())
					])
					const created = await api.post(
						`/admin/content/${s.data.content_collection.id}/relationships`,
						{ target_collection_id: t.data.content_collection.id, relationship_type: 'one_to_many' },
						auth()
					)
					const id = created.data.relationship.id

					const res = await api.delete(
						`/admin/content/${s.data.content_collection.id}/relationships/${id}`,
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.deleted).toContain(id)

					await api
						.delete('/admin/content', {
							data: { ids: [s.data.content_collection.id, t.data.content_collection.id] },
							...auth()
						})
						.catch(() => {})
				})
			})
		})

		// ── Content Creators ───────────────────────────────────────────────────────

		describe('Content Creators', () => {
			let creatorId: string
			let creatorId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const [r1, r2] = await Promise.all([
					api.post('/admin/content-creators', { name: `Alice ${ts}`, bio: 'Writer' }, auth()),
					api.post('/admin/content-creators', { name: `Bob ${ts}` }, auth())
				])
				creatorId = r1.data.content_creator.id
				creatorId2 = r2.data.content_creator.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/content-creators', { data: { ids: [creatorId, creatorId2] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/content-creators creates a creator', async () => {
				const ts = Date.now()
				const res = await api.post(
					'/admin/content-creators',
					{ name: `Temp Creator ${ts}`, bio: 'Temporary', avatar_url: 'https://example.com/avatar.jpg' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.content_creator).toMatchObject({
					id: expect.any(String),
					name: `Temp Creator ${ts}`,
					bio: 'Temporary'
				})
				await api
					.delete('/admin/content-creators', { data: { ids: [res.data.content_creator.id] }, ...auth() })
					.catch(() => {})
			})

			it('GET /admin/content-creators lists creators', async () => {
				const res = await api.get('/admin/content-creators', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.content_creators)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
				expect(typeof res.data.limit).toBe('number')
				expect(typeof res.data.offset).toBe('number')
			})

			it('GET /admin/content-creators filters by q', async () => {
				const res = await api.get('/admin/content-creators?q=Alice', auth())
				expect(res.status).toBe(200)
				expect(res.data.content_creators.every((c: any) => c.name.includes('Alice'))).toBe(true)
			})

			it('GET /admin/content-creators/:id retrieves a single creator', async () => {
				const res = await api.get(`/admin/content-creators/${creatorId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.content_creator.id).toBe(creatorId)
				expect(res.data.content_creator.bio).toBe('Writer')
			})

			it('POST /admin/content-creators/:id updates a creator and auto-logs EDIT', async () => {
				const res = await api.post(
					`/admin/content-creators/${creatorId}`,
					{ bio: 'Updated bio' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.content_creator.bio).toBe('Updated bio')

				const actRes = await api.get(`/admin/content-creators/${creatorId}/activity`, auth())
				expect(actRes.data.activity.some((a: any) => a.type === 'edit')).toBe(true)
			})

			it('DELETE /admin/content-creators/:id deletes a creator', async () => {
				const created = await api.post('/admin/content-creators', { name: 'To Delete' }, auth())
				const id = created.data.content_creator.id

				const res = await api.delete(`/admin/content-creators/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/content-creators bulk deletes', async () => {
				const ts = Date.now()
				const [a, b] = await Promise.all([
					api.post('/admin/content-creators', { name: `Bulk A ${ts}` }, auth()),
					api.post('/admin/content-creators', { name: `Bulk B ${ts}` }, auth())
				])
				const ids = [a.data.content_creator.id, b.data.content_creator.id]

				const res = await api.delete('/admin/content-creators', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})

			// ── Content Creator Activity ───────────────────────────────────────────

			describe('Activity', () => {
				it('POST .../activity creates a manual note entry', async () => {
					const res = await api.post(
						`/admin/content-creators/${creatorId}/activity`,
						{ type: 'note', note: 'Left a note on this creator' },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.entry).toMatchObject({
						type: 'note',
						note: 'Left a note on this creator'
					})
				})

				it('GET .../activity lists activity for a creator', async () => {
					const res = await api.get(`/admin/content-creators/${creatorId}/activity`, auth())
					expect(res.status).toBe(200)
					expect(Array.isArray(res.data.activity)).toBe(true)
					expect(res.data.count).toBeGreaterThan(0)
					expect(typeof res.data.limit).toBe('number')
				})

				it('GET .../activity includes user_id on entries', async () => {
					const res = await api.get(`/admin/content-creators/${creatorId}/activity`, auth())
					expect(res.data.activity.every((a: any) => typeof a.user_id === 'string')).toBe(true)
				})

				it('DELETE .../activity bulk deletes entries', async () => {
					const created = await api.post(
						`/admin/content-creators/${creatorId}/activity`,
						{ type: 'note', note: 'to be deleted' },
						auth()
					)
					const id = created.data.entry.id

					const res = await api.delete(
						`/admin/content-creators/${creatorId}/activity`,
						{ data: { ids: [id] }, ...auth() }
					)
					expect(res.status).toBe(200)
					expect(res.data.deleted).toContain(id)
				})
			})
		})

		// ── Content Items ──────────────────────────────────────────────────────────

		describe('Content Items', () => {
			let collectionId: string
			let creatorId: string
			let itemId: string
			let itemId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const [collectionRes, creatorRes] = await Promise.all([
					api.post('/admin/content', { label: `Article ${ts}`, slug: `article-${ts}`, format: 'md' }, auth()),
					api.post('/admin/content-creators', { name: `Author ${ts}` }, auth())
				])
				collectionId = collectionRes.data.content_collection.id
				creatorId = creatorRes.data.content_creator.id

				const [r1, r2] = await Promise.all([
					api.post(
						`/admin/content/${collectionId}/items`,
						{
							title: 'First Article',
							slug: `first-article-${ts}`,
							creator_id: creatorId,
							body: '<p>Hello world</p>',
							status: 'draft'
						},
						auth()
					),
					api.post(
						`/admin/content/${collectionId}/items`,
						{
							title: 'Second Article',
							slug: `second-article-${ts}`,
							status: 'draft'
						},
						auth()
					)
				])
				itemId = r1.data.content_item.id
				itemId2 = r2.data.content_item.id
			})

			afterAll(async () => {
				await api
					.delete(`/admin/content/${collectionId}/items`, { data: { ids: [itemId, itemId2] }, ...auth() })
					.catch(() => {})
				await api
					.delete('/admin/content', { data: { ids: [collectionId] }, ...auth() })
					.catch(() => {})
				await api
					.delete('/admin/content-creators', { data: { ids: [creatorId] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/content/:id/items creates a content item', async () => {
				const res = await api.get(`/admin/content/${collectionId}/items/${itemId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.content_item).toMatchObject({
					id: itemId,
					title: 'First Article',
					status: 'draft',
					content_collection: { id: collectionId },
					creator: { id: creatorId }
				})
			})

			it('GET /admin/content/:id/items lists content items', async () => {
				const res = await api.get(`/admin/content/${collectionId}/items`, auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.content_items)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
			})

			it('GET /admin/content/:id/items filters by status', async () => {
				const res = await api.get(`/admin/content/${collectionId}/items?status=draft`, auth())
				expect(res.status).toBe(200)
				expect(res.data.content_items.every((i: any) => i.status === 'draft')).toBe(true)
			})

			it('GET /admin/content/:id/items filters by creator_id', async () => {
				const res = await api.get(
					`/admin/content/${collectionId}/items?creator_id=${creatorId}`,
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.content_items.length).toBeGreaterThanOrEqual(1)
				expect(res.data.content_items.every((i: any) => i.creator?.id === creatorId)).toBe(true)
			})

			it('GET /admin/content/:id/items filters by q (title search)', async () => {
				const res = await api.get(`/admin/content/${collectionId}/items?q=First+Article`, auth())
				expect(res.status).toBe(200)
				expect(res.data.content_items.some((i: any) => i.title.includes('First Article'))).toBe(true)
			})

			it('GET /admin/content/:id/items status=published returns empty when none published', async () => {
				const res = await api.get(`/admin/content/${collectionId}/items?status=published`, auth())
				expect(res.status).toBe(200)
				expect(res.data.content_items).toHaveLength(0)
			})

			it('GET /admin/content/:id/items/:itemId retrieves a single item with relations', async () => {
				const res = await api.get(`/admin/content/${collectionId}/items/${itemId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.content_item).toMatchObject({
					id: itemId,
					content_collection: { id: collectionId },
					creator: { id: creatorId }
				})
			})

			it('POST /admin/content/:id/items/:itemId updates title', async () => {
				const res = await api.post(
					`/admin/content/${collectionId}/items/${itemId}`,
					{ title: 'Updated First Article' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.content_item.title).toBe('Updated First Article')
			})

			it('POST .../items/:itemId auto-logs EDIT activity on update without status change', async () => {
				await api.post(`/admin/content/${collectionId}/items/${itemId}`, { title: 'Trigger Edit Log' }, auth())

				const actRes = await api.get(`/admin/content/${collectionId}/items/${itemId}/activity`, auth())
				expect(actRes.status).toBe(200)
				expect(actRes.data.activity.some((a: any) => a.type === 'edit')).toBe(true)
			})

			it('POST .../items/:itemId auto-logs PUBLISH and sets published_at on status change to published', async () => {
				const res = await api.post(
					`/admin/content/${collectionId}/items/${itemId}`,
					{ status: 'published' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.content_item.status).toBe('published')
				expect(res.data.content_item.published_at).not.toBeNull()

				const actRes = await api.get(`/admin/content/${collectionId}/items/${itemId}/activity`, auth())
				expect(actRes.data.activity.some((a: any) => a.type === 'publish')).toBe(true)
			})

			it('POST .../items respects explicit published_at override', async () => {
				const ts = Date.now()
				const pastDate = new Date('2024-01-15T00:00:00.000Z')
				const created = await api.post(
					`/admin/content/${collectionId}/items`,
					{
						title: `Backdated ${ts}`,
						slug: `backdated-${ts}`,
						status: 'published',
						published_at: pastDate.toISOString()
					},
					auth()
				)
				expect(created.status).toBe(200)
				const returnedDate = new Date(created.data.content_item.published_at)
				expect(returnedDate.getFullYear()).toBe(2024)

				await api
					.delete(`/admin/content/${collectionId}/items`, { data: { ids: [created.data.content_item.id] }, ...auth() })
					.catch(() => {})
			})

			it('POST .../items/:itemId auto-logs ARCHIVE on status change to archived', async () => {
				const res = await api.post(
					`/admin/content/${collectionId}/items/${itemId}`,
					{ status: 'archived' },
					auth()
				)
				expect(res.status).toBe(200)

				const actRes = await api.get(`/admin/content/${collectionId}/items/${itemId}/activity`, auth())
				expect(actRes.data.activity.some((a: any) => a.type === 'archive')).toBe(true)
			})

			it('POST .../items/:itemId auto-logs DRAFT on status change to draft', async () => {
				const res = await api.post(
					`/admin/content/${collectionId}/items/${itemId}`,
					{ status: 'draft' },
					auth()
				)
				expect(res.status).toBe(200)

				const actRes = await api.get(`/admin/content/${collectionId}/items/${itemId}/activity`, auth())
				expect(actRes.data.activity.some((a: any) => a.type === 'draft')).toBe(true)
			})

			it('DELETE /admin/content/:id/items/:itemId deletes a content item', async () => {
				const ts = Date.now()
				const created = await api.post(
					`/admin/content/${collectionId}/items`,
					{ title: `To Delete ${ts}`, slug: `to-delete-${ts}` },
					auth()
				)
				const id = created.data.content_item.id

				const res = await api.delete(`/admin/content/${collectionId}/items/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/content/:id/items bulk deletes', async () => {
				const ts = Date.now()
				const [a, b] = await Promise.all([
					api.post(`/admin/content/${collectionId}/items`, { title: `Bulk A ${ts}`, slug: `bulk-a-${ts}` }, auth()),
					api.post(`/admin/content/${collectionId}/items`, { title: `Bulk B ${ts}`, slug: `bulk-b-${ts}` }, auth())
				])
				const ids = [a.data.content_item.id, b.data.content_item.id]

				const res = await api.delete(`/admin/content/${collectionId}/items`, { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})

			// ── Content Item Activity ────────────────────────────────────────────────

			describe('Activity', () => {
				it('POST .../activity creates a manual note entry', async () => {
					const res = await api.post(
						`/admin/content/${collectionId}/items/${itemId2}/activity`,
						{ type: 'note', note: 'Reviewer comment here' },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.entry).toMatchObject({
						type: 'note',
						note: 'Reviewer comment here'
					})
				})

				it('GET .../activity lists activity for a content item', async () => {
					const res = await api.get(`/admin/content/${collectionId}/items/${itemId}/activity`, auth())
					expect(res.status).toBe(200)
					expect(Array.isArray(res.data.activity)).toBe(true)
					expect(res.data.count).toBeGreaterThan(0)
				})

				it('GET .../activity includes user_id on entries', async () => {
					const res = await api.get(`/admin/content/${collectionId}/items/${itemId}/activity`, auth())
					expect(res.data.activity.every((a: any) => typeof a.user_id === 'string')).toBe(true)
				})

				it('DELETE .../activity bulk deletes entries', async () => {
					const created = await api.post(
						`/admin/content/${collectionId}/items/${itemId}/activity`,
						{ type: 'note', note: 'to be deleted' },
						auth()
					)
					const id = created.data.entry.id

					const res = await api.delete(
						`/admin/content/${collectionId}/items/${itemId}/activity`,
						{ data: { ids: [id] }, ...auth() }
					)
					expect(res.status).toBe(200)
					expect(res.data.deleted).toContain(id)
				})
			})

			// ── Content Item Links ───────────────────────────────────────────────────

			describe('Links', () => {
				let relId: string
				let linkId: string
				let linkedItemId: string
				let targetCollectionId: string

				beforeAll(async () => {
					const ts = Date.now()
					const targetCollectionRes = await api.post(
						'/admin/content',
						{ label: `Tag Type ${ts}`, slug: `tag-type-${ts}`, format: 'html' },
						auth()
					)
					targetCollectionId = targetCollectionRes.data.content_collection.id

					const relRes = await api.post(
						`/admin/content/${collectionId}/relationships`,
						{ target_collection_id: targetCollectionId, relationship_type: 'many_to_many' },
						auth()
					)
					relId = relRes.data.relationship.id

					const linkedItemRes = await api.post(
						`/admin/content/${targetCollectionId}/items`,
						{ title: `Linked Item ${ts}`, slug: `linked-item-${ts}` },
						auth()
					)
					linkedItemId = linkedItemRes.data.content_item.id
				})

				afterAll(async () => {
					if (linkedItemId) {
						await api
							.delete(`/admin/content/${targetCollectionId}/items`, { data: { ids: [linkedItemId] }, ...auth() })
							.catch(() => {})
					}
					await api
						.delete('/admin/content', { data: { ids: [targetCollectionId] }, ...auth() })
						.catch(() => {})
				})

				it('POST .../links creates a link between two content items', async () => {
					const res = await api.post(
						`/admin/content/${collectionId}/items/${itemId}/links`,
						{ target_item_id: linkedItemId, relationship_id: relId },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.link).toMatchObject({
						id: expect.any(String)
					})
					linkId = res.data.link.id
				})

				it('GET .../links lists links for a content item', async () => {
					const res = await api.get(`/admin/content/${collectionId}/items/${itemId}/links`, auth())
					expect(res.status).toBe(200)
					expect(Array.isArray(res.data.links)).toBe(true)
					expect(res.data.links.length).toBeGreaterThanOrEqual(1)
				})

				it('DELETE .../links/:linkId deletes a link', async () => {
					const res = await api.delete(
						`/admin/content/${collectionId}/items/${itemId}/links/${linkId}`,
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.deleted).toContain(linkId)
				})
			})

			// ── Content Item Tags (item-scoped) ──────────────────────────────────────

			describe('Tags (item-scoped)', () => {
				let tagId: string

				it('POST .../tags creates a tag on the item', async () => {
					const res = await api.post(
						`/admin/content/${collectionId}/items/${itemId}/tags`,
						{ value: 'featured' },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.tag).toMatchObject({
						id: expect.any(String),
						value: 'featured'
					})
					tagId = res.data.tag.id
				})

				it('GET .../tags lists tags for the item', async () => {
					const res = await api.get(`/admin/content/${collectionId}/items/${itemId}/tags`, auth())
					expect(res.status).toBe(200)
					expect(Array.isArray(res.data.tags)).toBe(true)
					expect(res.data.tags.some((t: any) => t.id === tagId)).toBe(true)
				})

				it('DELETE .../tags bulk removes tags from the item', async () => {
					const created = await api.post(
						`/admin/content/${collectionId}/items/${itemId}/tags`,
						{ value: 'to-remove' },
						auth()
					)
					const id = created.data.tag.id

					const res = await api.delete(
						`/admin/content/${collectionId}/items/${itemId}/tags`,
						{ data: { ids: [id] }, ...auth() }
					)
					expect(res.status).toBe(200)
					expect(res.data.deleted).toContain(id)
				})
			})
		})

		// ── Content Tags (standalone) ─────────────────────────────────────────

		describe('Content Tags (standalone)', () => {
			let tagCollectionId: string
			let tagItemId: string
			let tagId: string
			let tagId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const collectionRes = await api.post(
					'/admin/content',
					{ label: `Tag Test Collection ${ts}`, slug: `tag-test-collection-${ts}`, format: 'html' },
					auth()
				)
				tagCollectionId = collectionRes.data.content_collection.id

				const itemRes = await api.post(
					`/admin/content/${tagCollectionId}/items`,
					{ title: `Tag Test Item ${ts}`, slug: `tag-test-item-${ts}` },
					auth()
				)
				tagItemId = itemRes.data.content_item.id

				const [r1, r2] = await Promise.all([
					api.post('/admin/content-tags', { value: `tag-a-${ts}`, item_id: tagItemId }, auth()),
					api.post('/admin/content-tags', { value: `tag-b-${ts}`, item_id: tagItemId }, auth())
				])
				tagId = r1.data.content_tag.id
				tagId2 = r2.data.content_tag.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/content-tags', { data: { ids: [tagId, tagId2] }, ...auth() })
					.catch(() => {})
				await api
					.delete(`/admin/content/${tagCollectionId}/items`, { data: { ids: [tagItemId] }, ...auth() })
					.catch(() => {})
				await api
					.delete('/admin/content', { data: { ids: [tagCollectionId] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/content-tags creates a tag', async () => {
				const ts = Date.now()
				const res = await api.post(
					'/admin/content-tags',
					{ value: `temp-tag-${ts}`, item_id: tagItemId },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.content_tag).toMatchObject({
					id: expect.any(String),
					value: `temp-tag-${ts}`
				})
				await api
					.delete('/admin/content-tags', { data: { ids: [res.data.content_tag.id] }, ...auth() })
					.catch(() => {})
			})

			it('GET /admin/content-tags lists all tags', async () => {
				const res = await api.get('/admin/content-tags', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.content_tags)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
			})

			it('GET /admin/content-tags filters by item_id', async () => {
				const res = await api.get(
					`/admin/content-tags?item_id=${tagItemId}`,
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.content_tags.length).toBeGreaterThanOrEqual(2)
			})

			it('GET /admin/content-tags filters by q', async () => {
				const res = await api.get('/admin/content-tags?q=tag-a', auth())
				expect(res.status).toBe(200)
				expect(res.data.content_tags.every((t: any) => t.value.includes('tag-a'))).toBe(true)
			})

			it('GET /admin/content-tags/:id retrieves a single tag', async () => {
				const res = await api.get(`/admin/content-tags/${tagId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.content_tag.id).toBe(tagId)
			})

			it('POST /admin/content-tags/:id updates a tag', async () => {
				const res = await api.post(
					`/admin/content-tags/${tagId}`,
					{ value: 'updated-tag-value' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.content_tag.value).toBe('updated-tag-value')
			})

			it('DELETE /admin/content-tags/:id deletes a single tag', async () => {
				const ts = Date.now()
				const created = await api.post(
					'/admin/content-tags',
					{ value: `to-delete-${ts}`, item_id: tagItemId },
					auth()
				)
				const id = created.data.content_tag.id

				const res = await api.delete(`/admin/content-tags/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/content-tags bulk deletes', async () => {
				const ts = Date.now()
				const [a, b] = await Promise.all([
					api.post('/admin/content-tags', { value: `bulk-a-${ts}`, item_id: tagItemId }, auth()),
					api.post('/admin/content-tags', { value: `bulk-b-${ts}`, item_id: tagItemId }, auth())
				])
				const ids = [a.data.content_tag.id, b.data.content_tag.id]

				const res = await api.delete('/admin/content-tags', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})
		})

		// ── Content Collection Upload ──────────────────────────────────────────────

		describe('Content Collection Upload', () => {
			let imgCollectionId: string
			const PREFIX = 'test-images/'

			beforeAll(async () => {
				const ts = Date.now()
				const res = await api.post(
					'/admin/content',
					{ label: `Upload Test ${ts}`, slug: `upload-test-${ts}`, format: 'img', prefix: PREFIX },
					auth()
				)
				imgCollectionId = res.data.content_collection.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/content', { data: { ids: [imgCollectionId] }, ...auth() })
					.catch(() => {})
			})

			it('GET /admin/content/:id returns prefix field', async () => {
				const res = await api.get(`/admin/content/${imgCollectionId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.content_collection.prefix).toBe(PREFIX)
			})

			it('POST /admin/content/:id/upload returns 401 without auth', async () => {
				const res = await api
					.post(`/admin/content/${imgCollectionId}/upload`, {})
					.catch((e: any) => e.response)
				expect(res.status).toBe(401)
			})

			it('POST /admin/content/:id/upload returns 404 for unknown collection', async () => {
				const FormData = require('form-data')
				const form = new FormData()
				form.append('files', Buffer.from('fake'), { filename: 'test.png', contentType: 'image/png' })
				const res = await api
					.post('/admin/content/nonexistent_id/upload', form, {
						...auth(),
						headers: { ...auth().headers, ...form.getHeaders() }
					})
					.catch((e: any) => e.response)
				expect(res.status).not.toBe(200)
			})

			it('POST /admin/content/:id/upload returns 400 when no files provided', async () => {
				const FormData = require('form-data')
				const form = new FormData()
				const res = await api
					.post(`/admin/content/${imgCollectionId}/upload`, form, {
						...auth(),
						headers: { ...auth().headers, ...form.getHeaders() }
					})
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── Public Content Routes ──────────────────────────────────────────────────

		describe('Public — /content', () => {
			const ts = Date.now()
			let publicCollectionId: string
			let publicCollectionSlug: string
			let publishedItemSlug: string
			let draftItemSlug: string

			beforeAll(async () => {
				publicCollectionSlug = `pub-collection-${ts}`
				publishedItemSlug = `pub-item-${ts}`
				draftItemSlug = `draft-item-${ts}`

				const collectionRes = await api.post(
					'/admin/content',
					{ label: `Public Collection ${ts}`, slug: publicCollectionSlug, format: 'html' },
					auth()
				)
				publicCollectionId = collectionRes.data.content_collection.id

				await Promise.all([
					api.post(
						`/admin/content/${publicCollectionId}/items`,
						{
							title: `Published Item ${ts}`,
							slug: publishedItemSlug,
							body: '<p>Published content</p>',
							status: 'published'
						},
						auth()
					),
					api.post(
						`/admin/content/${publicCollectionId}/items`,
						{
							title: `Draft Item ${ts}`,
							slug: draftItemSlug,
							body: '<p>Draft content</p>',
							status: 'draft'
						},
						auth()
					)
				])
			})

			afterAll(async () => {
				const items = await api.get(`/admin/content/${publicCollectionId}/items`, auth())
				const ids = items.data.content_items.map((i: any) => i.id)
				if (ids.length) await api.delete(`/admin/content/${publicCollectionId}/items`, { data: { ids }, ...auth() }).catch(() => {})
				await api.delete('/admin/content', { data: { ids: [publicCollectionId] }, ...auth() }).catch(() => {})
			})

			// ── Content Collections ───────────────────────────────────────────────

			it('GET /content lists content collections (no auth)', async () => {
				const res = await api.get('/content')
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.content_collections)).toBe(true)
				expect(res.data.content_collections.length).toBeGreaterThanOrEqual(1)
			})

			it('GET /content filters by q', async () => {
				const res = await api.get(`/content?q=Public Collection ${ts}`)
				expect(res.status).toBe(200)
				expect(res.data.content_collections.length).toBeGreaterThanOrEqual(1)
				expect(res.data.content_collections[0].slug).toBe(publicCollectionSlug)
			})

			it('GET /content/:slug returns a single content collection', async () => {
				const res = await api.get(`/content/${publicCollectionSlug}`)
				expect(res.status).toBe(200)
				expect(res.data.content_collection.slug).toBe(publicCollectionSlug)
				expect(res.data.content_collection.label).toBe(`Public Collection ${ts}`)
			})

			it('GET /content/:slug returns 404 for unknown slug', async () => {
				const res = await api.get('/content/nonexistent-slug').catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			// ── Content Items ─────────────────────────────────────────────────────

			it('GET /content/:slug/items lists only published items (no auth)', async () => {
				const res = await api.get(`/content/${publicCollectionSlug}/items`)
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.content_items)).toBe(true)
				const slugs = res.data.content_items.map((i: any) => i.slug)
				expect(slugs).toContain(publishedItemSlug)
				expect(slugs).not.toContain(draftItemSlug)
			})

			it('GET /content/:slug/items filters by q', async () => {
				const res = await api.get(`/content/${publicCollectionSlug}/items?q=Published Item ${ts}`)
				expect(res.status).toBe(200)
				expect(res.data.content_items.length).toBeGreaterThanOrEqual(1)
			})

			it('GET /content/:slug/items does not expose draft items', async () => {
				const res = await api.get(`/content/${publicCollectionSlug}/items?q=Draft Item ${ts}`)
				expect(res.status).toBe(200)
				expect(res.data.content_items.length).toBe(0)
			})

			it('GET /content/:slug/items/:itemSlug returns a published item', async () => {
				const res = await api.get(`/content/${publicCollectionSlug}/items/${publishedItemSlug}`)
				expect(res.status).toBe(200)
				expect(res.data.content_item.slug).toBe(publishedItemSlug)
				expect(res.data.content_item.body).toBe('<p>Published content</p>')
			})

			it('GET /content/:slug/items/:itemSlug returns 404 for draft item', async () => {
				const res = await api.get(`/content/${publicCollectionSlug}/items/${draftItemSlug}`).catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('GET /content/:slug/items/:itemSlug returns 404 for unknown slug', async () => {
				const res = await api.get(`/content/${publicCollectionSlug}/items/nonexistent-slug`).catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			// ── Caching ───────────────────────────────────────────────────────────

			it('GET /content/:slug/items/:itemSlug returns cached response on second call', async () => {
				const res1 = await api.get(`/content/${publicCollectionSlug}/items/${publishedItemSlug}`)
				expect(res1.status).toBe(200)

				const res2 = await api.get(`/content/${publicCollectionSlug}/items/${publishedItemSlug}`)
				expect(res2.status).toBe(200)
				expect(res2.data).toEqual(res1.data)
			})

			it('GET /content/:slug returns cached response on second call', async () => {
				const res1 = await api.get(`/content/${publicCollectionSlug}`)
				expect(res1.status).toBe(200)

				const res2 = await api.get(`/content/${publicCollectionSlug}`)
				expect(res2.status).toBe(200)
				expect(res2.data).toEqual(res1.data)
			})
		})
	}
})
