/**
 * Integration tests for the order-note module.
 *
 * Covers:
 *  - Authentication enforcement on all admin endpoints
 *  - Request body validation (missing required fields)
 *  - GET /admin/order-notes (list, filter by order_id)
 *  - POST /admin/order-notes (create, with and without sent flag)
 *  - DELETE /admin/order-notes/:id
 *
 * NOTE: order_id is a plain text field with no FK validation, so a fake ID is
 * used throughout to avoid the overhead of creating a full Medusa order record.
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=order-notes
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
				body: { email: 'order-notes-test@example.com', password: 'Sup3rSecret!' }
			})

			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'order-notes-test@example.com',
						first_name: 'Notes',
						last_name: 'Tester'
					}
				}
			})

			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'order-notes-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		// ── Authentication ────────────────────────────────────────────────────────

		describe('Authentication', () => {
			const FAKE_ID = 'nonexistent_id'
			const endpoints = [
				['GET', '/admin/order-notes', null],
				['POST', '/admin/order-notes', { order_id: 'ord_1', note: 'x' }],
				['DELETE', `/admin/order-notes/${FAKE_ID}`, null]
			] as const

			it.each(endpoints)('%s %s returns 401 without auth token', async (method, path, body) => {
				let res: any
				if (method === 'GET') {
					res = await api.get(path).catch((e: any) => e.response)
				} else if (method === 'DELETE') {
					res = await api.delete(path).catch((e: any) => e.response)
				} else {
					res = await api.post(path, body).catch((e: any) => e.response)
				}
				expect(res.status).toBe(401)
			})
		})

		// ── Validation ────────────────────────────────────────────────────────────

		describe('Validation', () => {
			it('POST /admin/order-notes rejects missing order_id', async () => {
				const res = await api
					.post('/admin/order-notes', { note: 'A note' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/order-notes rejects missing note', async () => {
				const res = await api
					.post('/admin/order-notes', { order_id: 'ord_1' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── Order Notes CRUD ──────────────────────────────────────────────────────

		describe('Order Notes', () => {
			const ORDER_ID = 'ord_test_notes_001'
			const ORDER_ID_2 = 'ord_test_notes_002'
			let noteId: string
			let sentNoteId: string

			beforeAll(async () => {
				const [r1, r2] = await Promise.all([
					api.post(
						'/admin/order-notes',
						{ order_id: ORDER_ID, note: 'Internal note for testing', sent: false },
						auth()
					),
					api.post(
						'/admin/order-notes',
						{ order_id: ORDER_ID, note: 'Customer-facing note', sent: true },
						auth()
					)
				])
				noteId = r1.data.order_note.id
				sentNoteId = r2.data.order_note.id
			})

			afterAll(async () => {
				await Promise.all([
					api.delete(`/admin/order-notes/${noteId}`, auth()).catch(() => {}),
					api.delete(`/admin/order-notes/${sentNoteId}`, auth()).catch(() => {})
				])
			})

			it('POST /admin/order-notes creates a note with sent: false by default', async () => {
				const res = await api.post(
					'/admin/order-notes',
					{ order_id: ORDER_ID_2, note: 'Default sent flag' },
					auth()
				)
				expect(res.status).toBe(201)
				expect(res.data.order_note).toMatchObject({
					id: expect.any(String),
					order_id: ORDER_ID_2,
					note: 'Default sent flag',
					sent: false
				})
				await api.delete(`/admin/order-notes/${res.data.order_note.id}`, auth()).catch(() => {})
			})

			it('POST /admin/order-notes creates a note with sent: true', async () => {
				const res = await api.get(`/admin/order-notes?order_id=${ORDER_ID}`, auth())
				const sentNote = res.data.order_notes.find((n: any) => n.id === sentNoteId)
				expect(sentNote).toMatchObject({
					id: sentNoteId,
					order_id: ORDER_ID,
					note: 'Customer-facing note',
					sent: true
				})
			})

			it('POST /admin/order-notes sets user_id from auth context', async () => {
				const res = await api.get(`/admin/order-notes?order_id=${ORDER_ID}`, auth())
				const note = res.data.order_notes.find((n: any) => n.id === noteId)
				expect(note.user_id).toMatch(/^user_/)
			})

			it('GET /admin/order-notes lists notes', async () => {
				const res = await api.get('/admin/order-notes', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.order_notes)).toBe(true)
				expect(res.data.order_notes.length).toBeGreaterThanOrEqual(1)
				expect(res.data.count).toBeGreaterThanOrEqual(1)
				expect(res.data.limit).toBeGreaterThan(0)
				expect(res.data.offset).toBeGreaterThanOrEqual(0)
			})

			it('GET /admin/order-notes filters by order_id', async () => {
				const res = await api.get(`/admin/order-notes?order_id=${ORDER_ID}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.order_notes.length).toBeGreaterThanOrEqual(2)
				expect(res.data.order_notes.every((n: any) => n.order_id === ORDER_ID)).toBe(true)
			})

			it('GET /admin/order-notes returns empty array for unknown order_id', async () => {
				const res = await api.get('/admin/order-notes?order_id=ord_does_not_exist_xyz', auth())
				expect(res.status).toBe(200)
				expect(res.data.order_notes).toHaveLength(0)
			})

			it('GET /admin/order-notes returns notes with expected fields', async () => {
				const res = await api.get(`/admin/order-notes?order_id=${ORDER_ID}`, auth())
				const note = res.data.order_notes.find((n: any) => n.id === noteId)
				expect(note).toMatchObject({
					id: noteId,
					order_id: ORDER_ID,
					note: 'Internal note for testing',
					sent: false,
					created_at: expect.any(String)
				})
			})

			it('GET /admin/order-notes returns sent: true for customer-facing notes', async () => {
				const res = await api.get(`/admin/order-notes?order_id=${ORDER_ID}`, auth())
				const sent = res.data.order_notes.find((n: any) => n.id === sentNoteId)
				expect(sent.sent).toBe(true)
			})

			it('DELETE /admin/order-notes/:id deletes a note', async () => {
				const created = await api.post(
					'/admin/order-notes',
					{ order_id: ORDER_ID, note: 'To be deleted', sent: false },
					auth()
				)
				const id = created.data.order_note.id

				const res = await api.delete(`/admin/order-notes/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/order-notes/:id removes the note from subsequent list', async () => {
				const created = await api.post(
					'/admin/order-notes',
					{ order_id: ORDER_ID, note: 'Ephemeral note', sent: false },
					auth()
				)
				const id = created.data.order_note.id

				await api.delete(`/admin/order-notes/${id}`, auth())

				const listRes = await api.get(`/admin/order-notes?order_id=${ORDER_ID}`, auth())
				expect(listRes.data.order_notes.some((n: any) => n.id === id)).toBe(false)
			})
		})
	}
})
