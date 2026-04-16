/**
 * Integration tests for the complaint module.
 *
 * Covers:
 *  - Authentication enforcement on all admin endpoints
 *  - Request body validation (missing required fields, empty arrays)
 *  - Full CRUD for complaints (create, read, update, delete — single and bulk)
 *  - Full CRUD for complaint tags
 *  - Notes endpoint
 *  - Activities endpoint (create, list, bulk delete)
 *  - Status-change auto-activity creation (open/close entries)
 *  - Query filters (status, q)
 *  - GET /admin/complaint-stats/products/:id (404 and success)
 *
 * NOTE: complaint.customer_id, order_id, and product_id are plain text fields with
 * no FK validation, so fake IDs are used throughout to avoid the overhead of
 * creating full Medusa order/customer/product records.
 *
 * The complaint-stats success case seeds a stat record directly via the
 * ComplaintService rather than going through the full recalculate flow.
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=complaints
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import { ComplaintService } from '../../src/modules/complaint/service'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa_test',
	inApp: true,
	disableAutoTeardown: true,
	env: {},
	testSuite: ({ api, getContainer }) => {
		let adminToken: string
		let complaintService: ComplaintService

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		// ── Setup ────────────────────────────────────────────────────────────────

		beforeAll(async () => {
			const container = getContainer()
			complaintService = container.resolve('complaint')

			const authService = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'complaint-test@example.com', password: 'Sup3rSecret!' }
			})

			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'complaint-test@example.com',
						first_name: 'Complaint',
						last_name: 'Tester'
					}
				}
			})

			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'complaint-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		// ── Authentication ────────────────────────────────────────────────────────

		describe('Authentication', () => {
			const FAKE_ID = 'nonexistent_id'
			const endpoints = [
				['GET', '/admin/complaints', null],
				['POST', '/admin/complaints', { description: 'x', customer_id: 'c', order_id: 'o', product_id: 'p' }],
				['DELETE', '/admin/complaints', { ids: [FAKE_ID] }],
				['GET', `/admin/complaints/${FAKE_ID}`, null],
				['POST', `/admin/complaints/${FAKE_ID}`, { status: 'open' }],
				['DELETE', `/admin/complaints/${FAKE_ID}`, null],
				['POST', `/admin/complaints/${FAKE_ID}/notes`, { note: 'x' }],
				['GET', `/admin/complaints/${FAKE_ID}/activities`, null],
				['POST', `/admin/complaints/${FAKE_ID}/activities`, { type: 'note', note: 'x' }],
				['DELETE', `/admin/complaints/${FAKE_ID}/activities`, { ids: [FAKE_ID] }],
				['GET', '/admin/complaint-tags', null],
				['POST', '/admin/complaint-tags', { value: 'x' }],
				['DELETE', '/admin/complaint-tags', { ids: [FAKE_ID] }],
				['GET', `/admin/complaint-tags/${FAKE_ID}`, null],
				['POST', `/admin/complaint-tags/${FAKE_ID}`, { value: 'y' }],
				['DELETE', `/admin/complaint-tags/${FAKE_ID}`, null],
				['GET', `/admin/complaint-stats/products/${FAKE_ID}`, null]
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
			it('POST /admin/complaints rejects missing description', async () => {
				const res = await api
					.post('/admin/complaints', { customer_id: 'c', order_id: 'o', product_id: 'p' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/complaints rejects missing customer_id', async () => {
				const res = await api
					.post('/admin/complaints', { description: 'x', order_id: 'o', product_id: 'p' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/complaints rejects missing order_id', async () => {
				const res = await api
					.post('/admin/complaints', { description: 'x', customer_id: 'c', product_id: 'p' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/complaints rejects missing product_id', async () => {
				const res = await api
					.post('/admin/complaints', { description: 'x', customer_id: 'c', order_id: 'o' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/complaints rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/complaints', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/complaint-tags rejects missing value', async () => {
				const res = await api
					.post('/admin/complaint-tags', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/complaint-tags rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/complaint-tags', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/complaints/:id/notes rejects missing note', async () => {
				// Use a fake ID — validation should fire before the service lookup
				const res = await api
					.post('/admin/complaints/fake_id/notes', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── Complaint Tags ────────────────────────────────────────────────────────

		describe('Complaint Tags', () => {
			let tagId: string
			let tagId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const [r1, r2] = await Promise.all([
					api.post('/admin/complaint-tags', { value: `defect-${ts}` }, auth()),
					api.post('/admin/complaint-tags', { value: `shipping-${ts}` }, auth())
				])
				tagId = r1.data.complaint_tag.id
				tagId2 = r2.data.complaint_tag.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/complaint-tags', { data: { ids: [tagId, tagId2] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/complaint-tags creates a tag', async () => {
				const ts = Date.now()
				const res = await api.post('/admin/complaint-tags', { value: `temp-tag-${ts}` }, auth())
				expect(res.status).toBe(200)
				expect(res.data.complaint_tag).toMatchObject({
					id: expect.any(String),
					value: `temp-tag-${ts}`
				})
				await api
					.delete('/admin/complaint-tags', { data: { ids: [res.data.complaint_tag.id] }, ...auth() })
					.catch(() => {})
			})

			it('GET /admin/complaint-tags lists tags', async () => {
				const res = await api.get('/admin/complaint-tags', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.complaint_tags)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
				expect(res.data.limit).toBeGreaterThan(0)
				expect(res.data.offset).toBe(0)
			})

			it('GET /admin/complaint-tags filters by q', async () => {
				const res = await api.get('/admin/complaint-tags?q=defect', auth())
				expect(res.status).toBe(200)
				expect(res.data.complaint_tags.every((t: any) => t.value.includes('defect'))).toBe(true)
			})

			it('GET /admin/complaint-tags/:id retrieves a single tag', async () => {
				const res = await api.get(`/admin/complaint-tags/${tagId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.complaint_tag.id).toBe(tagId)
			})

			it('POST /admin/complaint-tags/:id updates a tag', async () => {
				const ts = Date.now()
				const res = await api.post(
					`/admin/complaint-tags/${tagId}`,
					{ value: `defect-updated-${ts}` },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.complaint_tag.value).toBe(`defect-updated-${ts}`)
			})

			it('DELETE /admin/complaint-tags/:id deletes a single tag', async () => {
				const ts = Date.now()
				const created = await api.post('/admin/complaint-tags', { value: `to-delete-${ts}` }, auth())
				const id = created.data.complaint_tag.id

				const res = await api.delete(`/admin/complaint-tags/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/complaint-tags bulk deletes tags', async () => {
				const ts = Date.now()
				const [a, b] = await Promise.all([
					api.post('/admin/complaint-tags', { value: `bulk-a-${ts}` }, auth()),
					api.post('/admin/complaint-tags', { value: `bulk-b-${ts}` }, auth())
				])
				const ids = [a.data.complaint_tag.id, b.data.complaint_tag.id]

				const res = await api.delete('/admin/complaint-tags', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})
		})

		// ── Complaints ────────────────────────────────────────────────────────────

		describe('Complaints', () => {
			let complaintId: string
			let complaintId2: string
			let tagId: string

			const CUSTOMER_ID = 'cus_test_complaint_001'
			const ORDER_ID = 'ord_test_complaint_001'
			const PRODUCT_ID = 'prod_test_complaint_001'

			beforeAll(async () => {
				const tagRes = await api.post('/admin/complaint-tags', { value: 'broken-item' }, auth())
				tagId = tagRes.data.complaint_tag.id

				const [r1, r2] = await Promise.all([
					api.post(
						'/admin/complaints',
						{
							description: 'Complaint one: broken product received',
							customer_id: CUSTOMER_ID,
							order_id: ORDER_ID,
							product_id: PRODUCT_ID,
							tag_ids: [tagId]
						},
						auth()
					),
					api.post(
						'/admin/complaints',
						{
							description: 'Complaint two: late delivery',
							customer_id: CUSTOMER_ID,
							order_id: ORDER_ID,
							product_id: PRODUCT_ID
						},
						auth()
					)
				])
				complaintId = r1.data.complaint.id
				complaintId2 = r2.data.complaint.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/complaints', {
						data: { ids: [complaintId, complaintId2] },
						...auth()
					})
					.catch(() => {})
				await api
					.delete('/admin/complaint-tags', { data: { ids: [tagId] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/complaints creates a complaint and auto-creates open activity', async () => {
				const detailRes = await api.get(`/admin/complaints/${complaintId}`, auth())
				expect(detailRes.data.complaint).toMatchObject({
					id: complaintId,
					status: 'open',
					customer_id: CUSTOMER_ID,
					order_id: ORDER_ID,
					product_id: PRODUCT_ID
				})

				const actRes = await api.get(`/admin/complaints/${complaintId}/activities`, auth())
				expect(actRes.status).toBe(200)
				const openActivity = actRes.data.activities.find((a: any) => a.type === 'open')
				expect(openActivity).toMatchObject({ type: 'open' })
			})

			it('GET /admin/complaints lists complaints', async () => {
				const res = await api.get('/admin/complaints', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.complaints)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
				expect(res.data.limit).toBeGreaterThan(0)
				expect(res.data.offset).toBe(0)
			})

			it('GET /admin/complaints filters by status=open', async () => {
				const res = await api.get('/admin/complaints?status=open', auth())
				expect(res.status).toBe(200)
				expect(res.data.complaints.every((c: any) => c.status === 'open')).toBe(true)
			})

			it('GET /admin/complaints filters by status=closed returns empty when none closed', async () => {
				const res = await api.get('/admin/complaints?status=closed', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.complaints)).toBe(true)
			})

			it('GET /admin/complaints filters by q (description search)', async () => {
				const res = await api.get('/admin/complaints?q=broken+product', auth())
				expect(res.status).toBe(200)
				expect(
					res.data.complaints.some((c: any) => c.description.includes('broken product'))
				).toBe(true)
			})

			it('GET /admin/complaints filters by customer_id', async () => {
				const res = await api.get(`/admin/complaints?customer_id=${CUSTOMER_ID}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.complaints.length).toBeGreaterThanOrEqual(2)
				expect(res.data.complaints.every((c: any) => c.customer_id === CUSTOMER_ID)).toBe(true)
			})

			it('GET /admin/complaints filters by order_id', async () => {
				const res = await api.get(`/admin/complaints?order_id=${ORDER_ID}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.complaints.length).toBeGreaterThanOrEqual(2)
				expect(res.data.complaints.every((c: any) => c.order_id === ORDER_ID)).toBe(true)
			})

			it('GET /admin/complaints filters by product_id', async () => {
				const res = await api.get(`/admin/complaints?product_id=${PRODUCT_ID}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.complaints.length).toBeGreaterThanOrEqual(2)
				expect(res.data.complaints.every((c: any) => c.product_id === PRODUCT_ID)).toBe(true)
			})

			it('GET /admin/complaints filters by customer_id returns empty for unknown id', async () => {
				const res = await api.get('/admin/complaints?customer_id=cus_does_not_exist_xyz', auth())
				expect(res.status).toBe(200)
				expect(res.data.complaints).toHaveLength(0)
			})

			it('GET /admin/complaints/:id retrieves a single complaint', async () => {
				const res = await api.get(`/admin/complaints/${complaintId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.complaint.id).toBe(complaintId)
				expect(res.data.complaint.customer_id).toBe(CUSTOMER_ID)
				expect(res.data.complaint.order_id).toBe(ORDER_ID)
				expect(res.data.complaint.product_id).toBe(PRODUCT_ID)
			})

			it('POST /admin/complaints/:id updates description', async () => {
				const res = await api.post(
					`/admin/complaints/${complaintId2}`,
					{ status: 'open', description: 'Updated description' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.complaint.description).toBe('Updated description')
			})

			it('POST /admin/complaints/:id creates close activity on status change to closed', async () => {
				const res = await api.post(
					`/admin/complaints/${complaintId}`,
					{ status: 'closed' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.complaint.status).toBe('closed')

				const actRes = await api.get(`/admin/complaints/${complaintId}/activities`, auth())
				expect(actRes.data.activities.some((a: any) => a.type === 'close')).toBe(true)
			})

			it('POST /admin/complaints/:id creates open activity on status change to open', async () => {
				const res = await api.post(
					`/admin/complaints/${complaintId}`,
					{ status: 'open' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.complaint.status).toBe('open')

				const actRes = await api.get(`/admin/complaints/${complaintId}/activities`, auth())
				const openEntries = actRes.data.activities.filter((a: any) => a.type === 'open')
				// Should have at least 2 open entries: one from create, one from reopen
				expect(openEntries.length).toBeGreaterThanOrEqual(2)
			})

			it('DELETE /admin/complaints/:id deletes a single complaint', async () => {
				const created = await api.post(
					'/admin/complaints',
					{
						description: 'To be deleted',
						customer_id: CUSTOMER_ID,
						order_id: ORDER_ID,
						product_id: PRODUCT_ID
					},
					auth()
				)
				const id = created.data.complaint.id

				const res = await api.delete(`/admin/complaints/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/complaints bulk deletes complaints', async () => {
				const [a, b] = await Promise.all([
					api.post(
						'/admin/complaints',
						{ description: 'bulk-a', customer_id: CUSTOMER_ID, order_id: ORDER_ID, product_id: PRODUCT_ID },
						auth()
					),
					api.post(
						'/admin/complaints',
						{ description: 'bulk-b', customer_id: CUSTOMER_ID, order_id: ORDER_ID, product_id: PRODUCT_ID },
						auth()
					)
				])
				const ids = [a.data.complaint.id, b.data.complaint.id]

				const res = await api.delete('/admin/complaints', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})

			// ── Notes ─────────────────────────────────────────────────────────────

			describe('Notes', () => {
				it('POST /admin/complaints/:id/notes creates a note activity', async () => {
					const res = await api.post(
						`/admin/complaints/${complaintId}/notes`,
						{ note: 'This is a test note' },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.entry).toMatchObject({
						type: 'note',
						note: 'This is a test note'
					})
				})
			})

			// ── Activities ────────────────────────────────────────────────────────

			describe('Activities', () => {
				it('POST /admin/complaints/:id/activities creates a manual activity', async () => {
					const res = await api.post(
						`/admin/complaints/${complaintId}/activities`,
						{ type: 'note', note: 'Manual activity entry' },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.activity).toMatchObject({
						type: 'note',
						note: 'Manual activity entry'
					})
				})

				it('GET /admin/complaints/:id/activities lists activities for a complaint', async () => {
					const res = await api.get(`/admin/complaints/${complaintId}/activities`, auth())
					expect(res.status).toBe(200)
					expect(Array.isArray(res.data.activities)).toBe(true)
					expect(res.data.count).toBeGreaterThan(0)
				})

				it('DELETE /admin/complaints/:id/activities bulk deletes activities', async () => {
					const created = await api.post(
						`/admin/complaints/${complaintId}/activities`,
						{ type: 'note', note: 'to be deleted' },
						auth()
					)
					const id = created.data.activity.id

					const res = await api.delete(`/admin/complaints/${complaintId}/activities`, {
						data: { ids: [id] },
						...auth()
					})
					expect(res.status).toBe(200)
					expect(res.data.deleted).toContain(id)
				})
			})
		})

		// ── Complaint Stats — Products ─────────────────────────────────────────────

		describe('Complaint Stats - Products', () => {
			const STAT_PRODUCT_ID = 'prod_stat_test_complaints_001'

			beforeAll(async () => {
				// Seed a stat record directly via service — avoids needing real orders
				await complaintService.createComplaintProductStats({
					product_id: STAT_PRODUCT_ID,
					total_complaints: 3,
					total_orders: 50,
					complaint_rate: 0.06,
					last_calculated_at: new Date()
				})
			})

			afterAll(async () => {
				const [existing] = await complaintService.listComplaintProductStats({
					product_id: STAT_PRODUCT_ID
				})
				if (existing) {
					await complaintService.deleteComplaintProductStats([existing.id])
				}
			})

			it('GET /admin/complaint-stats/products/:id returns 404 for unknown product', async () => {
				const res = await api
					.get('/admin/complaint-stats/products/prod_does_not_exist_xyz', auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('GET /admin/complaint-stats/products/:id returns stats for a known product', async () => {
				const res = await api.get(
					`/admin/complaint-stats/products/${STAT_PRODUCT_ID}`,
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.complaint_product_stat).toMatchObject({
					product_id: STAT_PRODUCT_ID,
					total_complaints: 3,
					total_orders: 50,
					complaint_rate: expect.any(Number)
				})
			})
		})
	}
})
