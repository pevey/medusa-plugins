/**
 * Integration tests for the customer-tag module.
 *
 * Covers:
 *  - Authentication enforcement on all admin endpoints
 *  - Request body validation (missing required fields, empty arrays, mutual-exclusion)
 *  - Full CRUD for customer tags (/admin/customer-tags)
 *  - Tag association and removal on customers (/admin/customers/:id/customer-tags)
 *  - q filter on tag list
 *
 * NOTE: The customer-tag module links to Medusa's built-in customer module via a
 * defined link. The link tests therefore create real customers via /admin/customers.
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=customer-tags
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa_test',
	inApp: true,
	disableAutoTeardown: true,
	env: {},
	testSuite: ({ api, getContainer }) => {
		let adminToken: string

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		// ── Setup ────────────────────────────────────────────────────────────────

		beforeAll(async () => {
			const container = getContainer()

			const authService = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'customer-tag-test@example.com', password: 'Sup3rSecret!' }
			})

			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'customer-tag-test@example.com',
						first_name: 'CustomerTag',
						last_name: 'Tester'
					}
				}
			})

			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'customer-tag-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		// ── Authentication ────────────────────────────────────────────────────────

		describe('Authentication', () => {
			const FAKE_ID = 'nonexistent_id'
			const endpoints = [
				['GET', '/admin/customer-tags', null],
				['POST', '/admin/customer-tags', { value: 'x' }],
				['DELETE', '/admin/customer-tags', { ids: [FAKE_ID] }],
				['GET', `/admin/customer-tags/${FAKE_ID}`, null],
				['POST', `/admin/customer-tags/${FAKE_ID}`, { value: 'y' }],
				['DELETE', `/admin/customer-tags/${FAKE_ID}`, null],
				['POST', `/admin/customers/${FAKE_ID}/customer-tags`, { tag: FAKE_ID }],
				['DELETE', `/admin/customers/${FAKE_ID}/customer-tags/${FAKE_ID}`, null]
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

		// ── Validation ────────────────────────────────────────────────────────────

		describe('Validation', () => {
			it('POST /admin/customer-tags rejects missing value', async () => {
				const res = await api
					.post('/admin/customer-tags', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/customer-tags rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/customer-tags', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/customers/:id/customer-tags rejects body with neither tag nor tag_id', async () => {
				const res = await api
					.post('/admin/customers/fake_cus/customer-tags', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/customers/:id/customer-tags rejects body with both tag and tag_id', async () => {
				const res = await api
					.post(
						'/admin/customers/fake_cus/customer-tags',
						{ tag: 'ctag_x', tag_id: 'ctag_y' },
						auth()
					)
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── Customer Tags CRUD ────────────────────────────────────────────────────

		describe('Customer Tags', () => {
			let tagId: string
			let tagId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const [r1, r2] = await Promise.all([
					api.post('/admin/customer-tags', { value: `vip-${ts}` }, auth()),
					api.post('/admin/customer-tags', { value: `wholesale-${ts}` }, auth())
				])
				tagId = r1.data.customer_tag.id
				tagId2 = r2.data.customer_tag.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/customer-tags', { data: { ids: [tagId, tagId2] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/customer-tags creates a tag', async () => {
				const ts = Date.now()
				const res = await api.post('/admin/customer-tags', { value: `temp-${ts}` }, auth())
				expect(res.status).toBe(200)
				expect(res.data.customer_tag).toMatchObject({
					id: expect.any(String),
					value: `temp-${ts}`
				})
				await api
					.delete('/admin/customer-tags', {
						data: { ids: [res.data.customer_tag.id] },
						...auth()
					})
					.catch(() => {})
			})

			it('GET /admin/customer-tags lists tags', async () => {
				const res = await api.get('/admin/customer-tags', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.customer_tags)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
				expect(res.data.limit).toBeGreaterThan(0)
				expect(res.data.offset).toBe(0)
			})

			it('GET /admin/customer-tags filters by q', async () => {
				const res = await api.get('/admin/customer-tags?q=vip', auth())
				expect(res.status).toBe(200)
				expect(res.data.customer_tags.every((t: any) => t.value.includes('vip'))).toBe(true)
			})

			it('GET /admin/customer-tags/:id retrieves a single tag', async () => {
				const res = await api.get(`/admin/customer-tags/${tagId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.customer_tag.id).toBe(tagId)
			})

			it('POST /admin/customer-tags/:id updates a tag', async () => {
				const ts = Date.now()
				const res = await api.post(
					`/admin/customer-tags/${tagId}`,
					{ value: `vip-updated-${ts}` },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.customer_tag).toMatchObject({
					id: tagId,
					value: `vip-updated-${ts}`
				})
			})

			it('DELETE /admin/customer-tags/:id deletes a single tag', async () => {
				const ts = Date.now()
				const created = await api.post('/admin/customer-tags', { value: `to-delete-${ts}` }, auth())
				const id = created.data.customer_tag.id

				const res = await api.delete(`/admin/customer-tags/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/customer-tags bulk deletes tags', async () => {
				const ts = Date.now()
				const [a, b] = await Promise.all([
					api.post('/admin/customer-tags', { value: `bulk-a-${ts}` }, auth()),
					api.post('/admin/customer-tags', { value: `bulk-b-${ts}` }, auth())
				])
				const ids = [a.data.customer_tag.id, b.data.customer_tag.id]

				const res = await api.delete('/admin/customer-tags', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})
		})

		// ── Customer ↔ Tag Links ──────────────────────────────────────────────────

		describe('Customer tag association', () => {
			let customerId: string
			let tagId: string
			let tagId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const [customerRes, tagRes1, tagRes2] = await Promise.all([
					api.post(
						'/admin/customers',
						{
							email: `tagged-customer-${ts}@example.com`,
							first_name: 'Tagged',
							last_name: 'Customer'
						},
						auth()
					),
					api.post('/admin/customer-tags', { value: `loyalty-${ts}` }, auth()),
					api.post('/admin/customer-tags', { value: `at-risk-${ts}` }, auth())
				])
				customerId = customerRes.data.customer.id
				tagId = tagRes1.data.customer_tag.id
				tagId2 = tagRes2.data.customer_tag.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/customer-tags', { data: { ids: [tagId, tagId2] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/customers/:id/customer-tags links a tag by tag_id', async () => {
				const res = await api.post(
					`/admin/customers/${customerId}/customer-tags`,
					{ tag_id: tagId },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data).toMatchObject({ customer_id: customerId, tag: tagId })
			})

			it('POST /admin/customers/:id/customer-tags links a tag by tag', async () => {
				const res = await api.post(
					`/admin/customers/${customerId}/customer-tags`,
					{ tag: tagId2 },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data).toMatchObject({ customer_id: customerId, tag: tagId2 })
			})

			it('linked tags appear when querying the customer with customer_tags field', async () => {
				const res = await api.get(
					`/admin/customers/${customerId}?fields=+customer_tags.id,+customer_tags.value`,
					auth()
				)
				expect(res.status).toBe(200)
				const tagIds = (res.data.customer.customer_tags ?? []).map((t: any) => t.id)
				expect(tagIds).toContain(tagId)
				expect(tagIds).toContain(tagId2)
			})

			it('DELETE /admin/customers/:id/customer-tags/:tagId removes a tag link', async () => {
				const res = await api.delete(
					`/admin/customers/${customerId}/customer-tags/${tagId}`,
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data).toMatchObject({
					customer_id: customerId,
					tag_id: tagId,
					deleted: true
				})

				// Confirm the tag is no longer linked
				const check = await api.get(
					`/admin/customers/${customerId}?fields=+customer_tags.id`,
					auth()
				)
				const remaining = (check.data.customer.customer_tags ?? []).map((t: any) => t.id)
				expect(remaining).not.toContain(tagId)
				expect(remaining).toContain(tagId2)
			})
		})
	}
})
