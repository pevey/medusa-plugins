/**
 * Integration tests for the Webhook module.
 *
 * Covers:
 *  - Trigger CRUD (admin API)
 *  - Action CRUD (admin API)
 *  - Query config upsert/delete (admin API)
 *  - Public incoming webhook endpoint: security, dispatch, mapping, static values
 *  - Delivery records created after dispatch
 *  - Array coercion and fan-out for medusa workflow actions
 *
 * Run with:
 *   npm run test:integration:http
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import http from 'http'
import { AddressInfo } from 'net'
import { createHmac } from 'crypto'

jest.setTimeout(120 * 1000)
// The BullMQ workflow engine emits a transient "Connection is closed" rejection
// between the first and second test (after createUserAccountWorkflow drains its queue).
// One retry is sufficient — the connection is re-established by the time it retries.
jest.retryTimes(1)

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MockRequest = {
	method: string
	url: string
	query: Record<string, string>
	headers: Record<string, string>
	body: Record<string, unknown> | null
}

/** Small HTTP server that records every request received. */
function startMockServer(): Promise<{
	url: string
	server: http.Server
	lastBody: () => Record<string, unknown> | null
	allBodies: () => Record<string, unknown>[]
	lastRequest: () => MockRequest | null
	allRequests: () => MockRequest[]
	reset: () => void
}> {
	const requests: MockRequest[] = []

	return new Promise(resolve => {
		const server = http.createServer((req, res) => {
			let raw = ''
			req.on('data', chunk => (raw += chunk))
			req.on('end', () => {
				const parsedUrl = new URL(req.url ?? '/', `http://127.0.0.1`)
				const query: Record<string, string> = {}
				parsedUrl.searchParams.forEach((v, k) => {
					query[k] = v
				})

				let body: Record<string, unknown> | null = null
				try {
					body = JSON.parse(raw)
				} catch {
					/* non-JSON */
				}

				requests.push({
					method: req.method ?? 'GET',
					url: req.url ?? '/',
					query,
					headers: req.headers as Record<string, string>,
					body
				})

				res.writeHead(200, { 'Content-Type': 'application/json' })
				res.end(JSON.stringify({ ok: true }))
			})
		})

		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as AddressInfo
			resolve({
				url: `http://127.0.0.1:${port}`,
				server,
				lastBody: () => requests[requests.length - 1]?.body ?? null,
				allBodies: () =>
					requests.map(r => r.body).filter((b): b is Record<string, unknown> => b !== null),
				lastRequest: () => requests[requests.length - 1] ?? null,
				allRequests: () => [...requests],
				reset: () => requests.splice(0)
			})
		})
	})
}

function hmacSign(secret: string, body: unknown): string {
	return createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex')
}

// ─── Test suite ───────────────────────────────────────────────────────────────

medusaIntegrationTestRunner({
	dbName: 'medusa_test',
	inApp: true,
	disableAutoTeardown: true,
	env: {},
	testSuite: ({ api, getContainer }) => {
		let adminToken: string
		let mock: Awaited<ReturnType<typeof startMockServer>>

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		// ── Global setup ────────────────────────────────────────────────────────

		beforeAll(async () => {
			const container = getContainer()
			const authService = container.resolve(Modules.AUTH)

			// Step 1: Create auth identity via emailpass provider
			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'webhook-test@example.com', password: 'Sup3rSecret!' }
			})

			// Step 2: Create user and link to auth identity
			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'webhook-test@example.com',
						first_name: 'Webhook',
						last_name: 'Tester'
					}
				}
			})

			// Step 3: Log in to get a session token for subsequent requests
			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'webhook-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token

			mock = await startMockServer()
		})

		afterAll(async () => {
			await new Promise<void>((resolve, reject) =>
				mock.server.close(err => (err ? reject(err) : resolve()))
			)
		})

		beforeEach(() => mock.reset())

		// ── Trigger CRUD ────────────────────────────────────────────────────────

		describe('Trigger CRUD', () => {
			let triggerId: string

			it('creates an incoming_webhook trigger', async () => {
				const res = await api.post(
					'/admin/webhook-triggers',
					{
						name: 'CRUD Test Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.trigger).toMatchObject({
					name: 'CRUD Test Trigger',
					trigger_type: 'incoming_webhook',
					is_active: true
				})
				triggerId = res.data.trigger.id
			})

			it('creates a medusa_event trigger', async () => {
				const res = await api.post(
					'/admin/webhook-triggers',
					{
						name: 'Event Trigger',
						trigger_type: 'medusa_event',
						trigger_events: ['customer.created'],
						is_active: true
					},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.trigger.trigger_type).toBe('medusa_event')
				expect(res.data.trigger.trigger_events).toContain('customer.created')
				// Note: intentionally not deleting here — the trigger persists but does not
				// affect other tests (each describe block creates its own triggers).
			})

			it('lists triggers', async () => {
				const res = await api.get('/admin/webhook-triggers', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.triggers)).toBe(true)
				expect(res.data.count).toBeGreaterThan(0)
			})

			it('gets trigger by id', async () => {
				const res = await api.get(`/admin/webhook-triggers/${triggerId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.trigger.id).toBe(triggerId)
			})

			it('updates trigger', async () => {
				const res = await api.post(
					`/admin/webhook-triggers/${triggerId}`,
					{ description: 'Updated via test', is_active: false },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.trigger.description).toBe('Updated via test')
				expect(res.data.trigger.is_active).toBe(false)
			})

			it('deletes trigger', async () => {
				const res = await api.delete(`/admin/webhook-triggers/${triggerId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(triggerId)
			})
		})

		// ── Action CRUD ─────────────────────────────────────────────────────────

		describe('Action CRUD', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const res = await api.post(
					'/admin/webhook-triggers',
					{ name: 'Action CRUD Trigger', trigger_type: 'incoming_webhook', is_active: true },
					auth()
				)
				triggerId = res.data.trigger.id
			})

			it('creates an outgoing_webhook action', async () => {
				const res = await api.post(
					`/admin/webhook-triggers/${triggerId}/actions`,
					{
						name: 'Forward Action',
						action_type: 'outgoing_webhook',
						target_url: 'https://example.com/hook',
						is_active: true,
						field_mappings: [{ source_path: 'id', target_key: 'customer_id' }],
						static_values: [{ key: 'source', value: 'test' }]
					},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.action).toMatchObject({
					name: 'Forward Action',
					action_type: 'outgoing_webhook',
					target_url: 'https://example.com/hook',
					is_active: true
				})
				expect(res.data.action.field_mappings).toHaveLength(1)
				actionId = res.data.action.id
			})

			it('lists actions for trigger', async () => {
				const res = await api.get(`/admin/webhook-triggers/${triggerId}/actions`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions).toHaveLength(1)
				expect(res.data.actions[0].id).toBe(actionId)
			})

			it('updates action', async () => {
				const res = await api.post(
					`/admin/webhook-triggers/${triggerId}/actions/${actionId}`,
					{
						name: 'Renamed Action',
						is_active: false,
						target_url: 'https://example.com/hook',
						field_mappings: []
					},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.action.name).toBe('Renamed Action')
				expect(res.data.action.is_active).toBe(false)
			})

			it('deletes action', async () => {
				const res = await api.delete(
					`/admin/webhook-triggers/${triggerId}/actions/${actionId}`,
					auth()
				)
				expect(res.status).toBe(200)

				// Verify gone
				const listRes = await api.get(`/admin/webhook-triggers/${triggerId}/actions`, auth())
				expect(listRes.data.actions).toHaveLength(0)
			})
		})

		// ── Filter queries ──────────────────────────────────────────────────────

		describe('Filter queries', () => {
			let incomingTriggerId: string
			let eventTriggerId: string
			let inactiveTriggerId: string
			let filterTriggerId: string
			let outgoingActionId: string
			let workflowActionId: string
			let inactiveActionId: string

			beforeAll(async () => {
				const [t1, t2, t3] = await Promise.all([
					api.post('/admin/webhook-triggers', { name: 'Filter: incoming active', trigger_type: 'incoming_webhook', is_active: true }, auth()),
					api.post('/admin/webhook-triggers', { name: 'Filter: event active', trigger_type: 'medusa_event', trigger_events: ['order.placed'], is_active: true }, auth()),
					api.post('/admin/webhook-triggers', { name: 'Filter: incoming inactive', trigger_type: 'incoming_webhook', is_active: false }, auth())
				])
				incomingTriggerId = t1.data.trigger.id
				eventTriggerId = t2.data.trigger.id
				inactiveTriggerId = t3.data.trigger.id

				// Trigger for action-level filter tests
				const tRes = await api.post('/admin/webhook-triggers', { name: 'Filter: action parent', trigger_type: 'incoming_webhook', is_active: true }, auth())
				filterTriggerId = tRes.data.trigger.id

				const [a1, a2, a3] = await Promise.all([
					api.post(`/admin/webhook-triggers/${filterTriggerId}/actions`, { name: 'Filter Action: outgoing active', action_type: 'outgoing_webhook', target_url: 'https://example.com', is_active: true }, auth()),
					api.post(`/admin/webhook-triggers/${filterTriggerId}/actions`, { name: 'Filter Action: workflow active', action_type: 'medusa_workflow', medusa_workflow: 'createOrderWorkflow', is_active: true }, auth()),
					api.post(`/admin/webhook-triggers/${filterTriggerId}/actions`, { name: 'Filter Action: outgoing inactive', action_type: 'outgoing_webhook', target_url: 'https://example.com', is_active: false }, auth())
				])
				outgoingActionId = a1.data.action.id
				workflowActionId = a2.data.action.id
				inactiveActionId = a3.data.action.id
			})

			// ── Trigger filters ────────────────────────────────────────────────────

			it('GET /admin/webhook-triggers filters by q (name search)', async () => {
				const res = await api.get('/admin/webhook-triggers?q=Filter%3A+incoming', auth())
				expect(res.status).toBe(200)
				expect(res.data.triggers.length).toBeGreaterThanOrEqual(1)
				expect(res.data.triggers.every((t: any) => t.name.includes('Filter: incoming'))).toBe(true)
			})

			it('GET /admin/webhook-triggers filters by trigger_type=incoming_webhook', async () => {
				const res = await api.get('/admin/webhook-triggers?trigger_type=incoming_webhook', auth())
				expect(res.status).toBe(200)
				expect(res.data.triggers.every((t: any) => t.trigger_type === 'incoming_webhook')).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === incomingTriggerId)).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === eventTriggerId)).toBe(false)
			})

			it('GET /admin/webhook-triggers filters by trigger_type=medusa_event', async () => {
				const res = await api.get('/admin/webhook-triggers?trigger_type=medusa_event', auth())
				expect(res.status).toBe(200)
				expect(res.data.triggers.every((t: any) => t.trigger_type === 'medusa_event')).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === eventTriggerId)).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === incomingTriggerId)).toBe(false)
			})

			it('GET /admin/webhook-triggers filters by is_active=true', async () => {
				const res = await api.get('/admin/webhook-triggers?is_active=true', auth())
				expect(res.status).toBe(200)
				expect(res.data.triggers.every((t: any) => t.is_active === true)).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === inactiveTriggerId)).toBe(false)
			})

			it('GET /admin/webhook-triggers filters by is_active=false', async () => {
				const res = await api.get('/admin/webhook-triggers?is_active=false', auth())
				expect(res.status).toBe(200)
				expect(res.data.triggers.every((t: any) => t.is_active === false)).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === inactiveTriggerId)).toBe(true)
			})

			// ── Action filters ─────────────────────────────────────────────────────

			it('GET /admin/webhook-triggers/:id/actions filters by action_type=outgoing_webhook', async () => {
				const res = await api.get(`/admin/webhook-triggers/${filterTriggerId}/actions?action_type=outgoing_webhook`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions.every((a: any) => a.action_type === 'outgoing_webhook')).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === outgoingActionId)).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === workflowActionId)).toBe(false)
			})

			it('GET /admin/webhook-triggers/:id/actions filters by action_type=medusa_workflow', async () => {
				const res = await api.get(`/admin/webhook-triggers/${filterTriggerId}/actions?action_type=medusa_workflow`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions.every((a: any) => a.action_type === 'medusa_workflow')).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === workflowActionId)).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === outgoingActionId)).toBe(false)
			})

			it('GET /admin/webhook-triggers/:id/actions filters by is_active=true', async () => {
				const res = await api.get(`/admin/webhook-triggers/${filterTriggerId}/actions?is_active=true`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions.every((a: any) => a.is_active === true)).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === inactiveActionId)).toBe(false)
			})

			it('GET /admin/webhook-triggers/:id/actions filters by is_active=false', async () => {
				const res = await api.get(`/admin/webhook-triggers/${filterTriggerId}/actions?is_active=false`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions.every((a: any) => a.is_active === false)).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === inactiveActionId)).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === outgoingActionId)).toBe(false)
			})

			// ── Delivery filters ───────────────────────────────────────────────────

			it('GET deliveries filters by status=success', async () => {
				// Create a trigger+action pointing at mock.url to ensure a success delivery
				const tRes = await api.post('/admin/webhook-triggers', { name: 'Delivery Filter Trigger', trigger_type: 'incoming_webhook', is_active: true }, auth())
				const tid = tRes.data.trigger.id
				const aRes = await api.post(`/admin/webhook-triggers/${tid}/actions`, { name: 'Delivery Filter Action', action_type: 'outgoing_webhook', target_url: mock.url, is_active: true }, auth())
				const aid = aRes.data.action.id

				// Fire to create a success delivery
				await api.post(`/webhooks/${tid}`, { hello: 'world' })

				const res = await api.get(`/admin/webhook-triggers/${tid}/actions/${aid}/deliveries?status=success`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deliveries.length).toBeGreaterThan(0)
				expect(res.data.deliveries.every((d: any) => d.status === 'success')).toBe(true)
			})

			it('GET deliveries filters by status=failed returns empty when all succeeded', async () => {
				const tRes = await api.post('/admin/webhook-triggers', { name: 'Delivery Failed Filter Trigger', trigger_type: 'incoming_webhook', is_active: true }, auth())
				const tid = tRes.data.trigger.id
				const aRes = await api.post(`/admin/webhook-triggers/${tid}/actions`, { name: 'Delivery Failed Action', action_type: 'outgoing_webhook', target_url: mock.url, is_active: true }, auth())
				const aid = aRes.data.action.id

				await api.post(`/webhooks/${tid}`, { hello: 'world' })

				const res = await api.get(`/admin/webhook-triggers/${tid}/actions/${aid}/deliveries?status=failed`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deliveries).toHaveLength(0)
			})
		})

		// ── Query config ────────────────────────────────────────────────────────

		describe('Query config', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{
						name: 'Query Config Trigger',
						trigger_type: 'medusa_event',
						trigger_events: ['customer.created'],
						is_active: true
					},
					auth()
				)
				triggerId = tRes.data.trigger.id

				const aRes = await api.post(
					`/admin/webhook-triggers/${triggerId}/actions`,
					{
						name: 'Query Action',
						action_type: 'outgoing_webhook',
						target_url: 'https://example.com',
						is_active: true
					},
					auth()
				)
				actionId = aRes.data.action.id
			})

			const queryUrl = () => `/admin/webhook-triggers/${triggerId}/actions/${actionId}/query`

			it('returns null when no query config exists', async () => {
				const res = await api.get(queryUrl(), auth())
				expect(res.status).toBe(200)
				expect(res.data.query).toBeNull()
			})

			it('creates a query config', async () => {
				const res = await api.post(
					queryUrl(),
					{
						entity_name: 'customer',
						fields: ['id', 'email'],
						filters: { id: '$event.id' },
						limit: 1
					},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.query).toMatchObject({ entity_name: 'customer', limit: 1 })
				expect(res.data.query.fields).toContain('id')
			})

			it('upserts (updates) an existing query config', async () => {
				const res = await api.post(
					queryUrl(),
					{ entity_name: 'order', fields: ['id', 'total'], limit: 5 },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.query.entity_name).toBe('order')
				expect(res.data.query.limit).toBe(5)
			})

			it('clamps limit to 100', async () => {
				const res = await api.post(queryUrl(), { entity_name: 'customer', limit: 9999 }, auth())
				expect(res.data.query.limit).toBe(100)
			})

			it('deletes the query config', async () => {
				await api.delete(queryUrl(), auth())
				const res = await api.get(queryUrl(), auth())
				expect(res.data.query).toBeNull()
			})
		})

		// ── Public endpoint security ────────────────────────────────────────────

		describe('Public endpoint security', () => {
			let triggerId: string
			const signingKey = 'test-signing-secret'

			beforeAll(async () => {
				const res = await api.post(
					'/admin/webhook-triggers',
					{
						name: 'Signed Trigger',
						trigger_type: 'incoming_webhook',
						trigger_signing_key: signingKey,
						is_active: true
					},
					auth()
				)
				triggerId = res.data.trigger.id
			})

			it('returns 404 for an unknown trigger id', async () => {
				const res = await api
					.post('/webhooks/nonexistent-id-xyz', { foo: 'bar' })
					.catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('returns 404 when trigger is inactive', async () => {
				// Create a dedicated inactive trigger (avoids touching the signed one)
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{ name: 'Inactive Trigger', trigger_type: 'incoming_webhook', is_active: false },
					auth()
				)
				const id = tRes.data.trigger.id

				const res = await api
					.post(`/webhooks/${id}`, { foo: 'bar' })
					.catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('returns 401 when signing key is required but header is missing', async () => {
				const res = await api
					.post(`/webhooks/${triggerId}`, { foo: 'bar' })
					.catch((e: any) => e.response)
				expect(res.status).toBe(401)
				expect(res.data.error).toMatch(/signature/i)
			})

			it('returns 401 when signature is invalid', async () => {
				const res = await api
					.post(
						`/webhooks/${triggerId}`,
						{ foo: 'bar' },
						{
							headers: { 'x-webhook-signature': 'bad-signature' }
						}
					)
					.catch((e: any) => e.response)
				expect(res.status).toBe(401)
			})

			it('returns 200 with a valid HMAC-SHA256 signature', async () => {
				const body = { foo: 'bar' }
				const sig = hmacSign(signingKey, body)
				const res = await api.post(`/webhooks/${triggerId}`, body, {
					headers: { 'x-webhook-signature': sig }
				})
				expect(res.status).toBe(200)
			})
		})

		// ── Dispatch: outgoing webhook ──────────────────────────────────────────

		describe('Dispatch: outgoing webhook', () => {
			let triggerId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{
						name: 'Outgoing Dispatch Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				triggerId = tRes.data.trigger.id

				await api.post(
					`/admin/webhook-triggers/${triggerId}/actions`,
					{
						name: 'Forward Action',
						action_type: 'outgoing_webhook',
						target_url: mock.url,
						is_active: true,
						field_mappings: [
							{ source_path: 'customer.email', target_key: 'email' },
							{ source_path: 'customer.name', target_key: 'full_name' }
						],
						static_values: [
							{ key: 'source', value: 'medusa' },
							{ key: 'version', value: '2' }
						]
					},
					auth()
				)
			})

			it('returns 200 and records actions_executed count', async () => {
				const res = await api.post(`/webhooks/${triggerId}`, {
					customer: { email: 'a@test.com', name: 'Alice' }
				})
				expect(res.status).toBe(200)
				expect(res.data.received).toBe(true)
				expect(res.data.actions_executed).toBe(1)
			})

			it('applies field mappings to the outgoing payload', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					customer: { email: 'b@test.com', name: 'Bob Jones' }
				})

				// Dispatch is synchronous in the handler — body is received before response
				expect(mock.lastBody()).toEqual(
					expect.objectContaining({ email: 'b@test.com', full_name: 'Bob Jones' })
				)
			})

			it('merges static values into the outgoing payload', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					customer: { email: 'c@test.com', name: 'Carol' }
				})

				expect(mock.lastBody()).toEqual(
					expect.objectContaining({ source: 'medusa', version: '2' })
				)
			})

			it('omits unmapped source fields from the outgoing payload', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					customer: { email: 'd@test.com', name: 'Dave', secret: 'should-not-appear' }
				})

				const body = mock.lastBody()
				expect(body).not.toHaveProperty('secret')
				expect(body).not.toHaveProperty('customer')
			})

			it('creates a SUCCESS delivery record', async () => {
				mock.reset()
				await api.post(`/webhooks/${triggerId}`, {
					customer: { email: 'e@test.com', name: 'Eve' }
				})

				const actionsRes = await api.get(`/admin/webhook-triggers/${triggerId}/actions`, auth())
				const actionId = actionsRes.data.actions[0].id

				const delRes = await api.get(
					`/admin/webhook-triggers/${triggerId}/actions/${actionId}/deliveries`,
					auth()
				)
				expect(delRes.status).toBe(200)
				expect(delRes.data.deliveries.length).toBeGreaterThan(0)
				expect(delRes.data.deliveries[0].status).toBe('success')
			})

			it('creates a FAILED delivery record when target URL is unreachable', async () => {
				// Create a trigger pointing at port 1 (always refused)
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{ name: 'Fail Trigger', trigger_type: 'incoming_webhook', is_active: true },
					auth()
				)
				const failTriggerId = tRes.data.trigger.id

				const aRes = await api.post(
					`/admin/webhook-triggers/${failTriggerId}/actions`,
					{
						name: 'Fail Action',
						action_type: 'outgoing_webhook',
						target_url: 'http://127.0.0.1:1/no-such-host',
						is_active: true
					},
					auth()
				)
				const failActionId = aRes.data.action.id

				await api.post(`/webhooks/${failTriggerId}`, { test: 1 }).catch(() => {})

				const delRes = await api.get(
					`/admin/webhook-triggers/${failTriggerId}/actions/${failActionId}/deliveries`,
					auth()
				)
				const failed = delRes.data.deliveries.find((d: any) => d.status === 'failed')
				expect(failed).toMatchObject({
					status: 'failed',
					id: expect.any(String)
				})
			})
		})

		// ── Dispatch: workflow — array coercion ─────────────────────────────────

		describe('Dispatch: workflow — array coercion (single object → array)', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{ name: 'Coercion Trigger', trigger_type: 'incoming_webhook', is_active: true },
					auth()
				)
				triggerId = tRes.data.trigger.id

				// Map `customer` (single object) → `customersData[]` (array field)
				// The [] target suffix signals: coerce to array if not already one
				const aRes = await api.post(
					`/admin/webhook-triggers/${triggerId}/actions`,
					{
						name: 'Coerce Action',
						action_type: 'medusa_workflow',
						medusa_workflow: 'createCustomersWorkflow',
						is_active: true,
						field_mappings: [{ source_path: 'customer', target_key: 'customersData[]' }]
					},
					auth()
				)
				actionId = aRes.data.action.id
			})

			it('coerces a single object to an array and runs the workflow once', async () => {
				const uniqueEmail = `coerce-${Date.now()}@test.com`

				const dispatchRes = await api.post(`/webhooks/${triggerId}`, {
					customer: { email: uniqueEmail, first_name: 'Coerce', last_name: 'Test' }
				})
				expect(dispatchRes.status).toBe(200)

				// Verify delivery was recorded as success
				const delRes = await api.get(
					`/admin/webhook-triggers/${triggerId}/actions/${actionId}/deliveries`,
					auth()
				)
				expect(delRes.data.deliveries[0].status).toBe('success')

				// Verify customer was actually created
				const custRes = await api.get(
					`/admin/customers?q=${encodeURIComponent(uniqueEmail)}`,
					auth()
				)
				expect(custRes.data.customers.length).toBe(1)
				expect(custRes.data.customers[0].email).toBe(uniqueEmail)
			})
		})

		// ── Dispatch: workflow — fan-out ────────────────────────────────────────

		describe('Dispatch: workflow — fan-out ([] in source path)', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{ name: 'Fanout Trigger', trigger_type: 'incoming_webhook', is_active: true },
					auth()
				)
				triggerId = tRes.data.trigger.id

				// Map `customers[].email` → `customersData[].email` etc.
				// The [] in the SOURCE triggers fan-out: run workflow once per customer.
				const aRes = await api.post(
					`/admin/webhook-triggers/${triggerId}/actions`,
					{
						name: 'Fanout Action',
						action_type: 'medusa_workflow',
						medusa_workflow: 'createCustomersWorkflow',
						is_active: true,
						field_mappings: [
							// customers[] = fan-out (run workflow once per item)
							// customersData[] = coerce each item to [item] for workflow input
							{ source_path: 'customers[]', target_key: 'customersData[]' }
						]
					},
					auth()
				)
				actionId = aRes.data.action.id
			})

			it('runs the workflow once per item in the source array', async () => {
				const ts = Date.now()
				const email1 = `fanout-a-${ts}@test.com`
				const email2 = `fanout-b-${ts}@test.com`

				const dispatchRes = await api.post(`/webhooks/${triggerId}`, {
					customers: [
						{ email: email1, first_name: 'Alpha', last_name: 'Test' },
						{ email: email2, first_name: 'Beta', last_name: 'Test' }
					]
				})
				expect(dispatchRes.status).toBe(200)

				// Delivery should be recorded as success
				const delRes = await api.get(
					`/admin/webhook-triggers/${triggerId}/actions/${actionId}/deliveries`,
					auth()
				)
				expect(delRes.data.deliveries[0].status).toBe('success')

				// Both customers should have been created
				const res1 = await api.get(`/admin/customers?q=${encodeURIComponent(email1)}`, auth())
				const res2 = await api.get(`/admin/customers?q=${encodeURIComponent(email2)}`, auth())
				expect(res1.data.customers.length).toBe(1)
				expect(res2.data.customers.length).toBe(1)
			})

			it('coerces a single object to an array when source uses [] notation', async () => {
				const ts = Date.now()
				const email = `fanout-single-${ts}@test.com`

				await api.post(`/webhooks/${triggerId}`, {
					customers: { email, first_name: 'Solo', last_name: 'Item' }
				})

				const custRes = await api.get(`/admin/customers?q=${encodeURIComponent(email)}`, auth())
				expect(custRes.data.customers.length).toBe(1)
			})
		})

		// ── Action CRUD: outgoing_request ──────────────────────────────────────

		describe('Action CRUD: outgoing_request', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const res = await api.post(
					'/admin/webhook-triggers',
					{
						name: 'Request Action CRUD Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				triggerId = res.data.trigger.id
			})

			it('creates an outgoing_request action with request_method', async () => {
				const res = await api.post(
					`/admin/webhook-triggers/${triggerId}/actions`,
					{
						name: 'GET Request Action',
						action_type: 'outgoing_request',
						target_url: 'https://example.com/api/search',
						request_method: 'GET',
						is_active: true,
						field_mappings: [{ source_path: 'id', target_key: 'customer_id' }],
						target_headers: [{ key: 'X-Api-Key', value: 'secret123' }]
					},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.action).toMatchObject({
					name: 'GET Request Action',
					action_type: 'outgoing_request',
					target_url: 'https://example.com/api/search',
					request_method: 'GET',
					is_active: true
				})
				expect(res.data.action.field_mappings).toHaveLength(1)
				actionId = res.data.action.id
			})

			it('lists the outgoing_request action', async () => {
				const res = await api.get(`/admin/webhook-triggers/${triggerId}/actions`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions).toHaveLength(1)
				expect(res.data.actions[0].action_type).toBe('outgoing_request')
			})

			it('updates request_method on an outgoing_request action', async () => {
				const res = await api.post(
					`/admin/webhook-triggers/${triggerId}/actions/${actionId}`,
					{
						name: 'POST Request Action',
						target_url: 'https://example.com/api/create',
						request_method: 'POST',
						is_active: true
					},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.action.request_method).toBe('POST')
				expect(res.data.action.name).toBe('POST Request Action')
			})

			it('deletes the outgoing_request action', async () => {
				const res = await api.delete(
					`/admin/webhook-triggers/${triggerId}/actions/${actionId}`,
					auth()
				)
				expect(res.status).toBe(200)

				const listRes = await api.get(`/admin/webhook-triggers/${triggerId}/actions`, auth())
				expect(listRes.data.actions).toHaveLength(0)
			})
		})

		// ── Dispatch: outgoing_request POST ────────────────────────────────────

		describe('Dispatch: outgoing_request POST', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{ name: 'Request POST Trigger', trigger_type: 'incoming_webhook', is_active: true },
					auth()
				)
				triggerId = tRes.data.trigger.id

				const aRes = await api.post(
					`/admin/webhook-triggers/${triggerId}/actions`,
					{
						name: 'POST Request Action',
						action_type: 'outgoing_request',
						target_url: mock.url,
						request_method: 'POST',
						is_active: true,
						field_mappings: [
							{ source_path: 'user.email', target_key: 'email' },
							{ source_path: 'user.id', target_key: 'external_id' }
						],
						static_values: [{ key: 'origin', value: 'medusa' }],
						target_headers: [{ key: 'X-Custom-Header', value: 'test-value' }]
					},
					auth()
				)
				actionId = aRes.data.action.id
			})

			it('sends a POST request with JSON body to the target URL', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					user: { email: 'post@test.com', id: 'usr_123' }
				})

				const req = mock.lastRequest()
				expect(req?.method).toBe('POST')
				expect(req?.body).toMatchObject({
					email: 'post@test.com',
					external_id: 'usr_123',
					origin: 'medusa'
				})
			})

			it('does not append query parameters for POST', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					user: { email: 'post2@test.com', id: 'usr_456' }
				})

				const req = mock.lastRequest()
				expect(Object.keys(req?.query ?? {})).toHaveLength(0)
			})

			it('forwards custom headers in the POST request', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					user: { email: 'hdr@test.com', id: 'usr_789' }
				})

				const req = mock.lastRequest()
				expect(req?.headers['x-custom-header']).toBe('test-value')
			})

			it('creates a SUCCESS delivery record', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					user: { email: 'del@test.com', id: 'usr_del' }
				})

				const delRes = await api.get(
					`/admin/webhook-triggers/${triggerId}/actions/${actionId}/deliveries`,
					auth()
				)
				expect(delRes.data.deliveries.length).toBeGreaterThan(0)
				expect(delRes.data.deliveries[0].status).toBe('success')
			})
		})

		// ── Dispatch: outgoing_request PUT ─────────────────────────────────────

		describe('Dispatch: outgoing_request PUT', () => {
			let triggerId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{ name: 'Request PUT Trigger', trigger_type: 'incoming_webhook', is_active: true },
					auth()
				)
				triggerId = tRes.data.trigger.id

				await api.post(
					`/admin/webhook-triggers/${triggerId}/actions`,
					{
						name: 'PUT Request Action',
						action_type: 'outgoing_request',
						target_url: mock.url,
						request_method: 'PUT',
						is_active: true,
						field_mappings: [{ source_path: 'item.name', target_key: 'name' }]
					},
					auth()
				)
			})

			it('sends a PUT request with JSON body', async () => {
				await api.post(`/webhooks/${triggerId}`, { item: { name: 'Widget' } })

				const req = mock.lastRequest()
				expect(req?.method).toBe('PUT')
				expect(req?.body).toMatchObject({ name: 'Widget' })
				expect(Object.keys(req?.query ?? {})).toHaveLength(0)
			})
		})

		// ── Dispatch: outgoing_request GET ─────────────────────────────────────

		describe('Dispatch: outgoing_request GET', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{ name: 'Request GET Trigger', trigger_type: 'incoming_webhook', is_active: true },
					auth()
				)
				triggerId = tRes.data.trigger.id

				const aRes = await api.post(
					`/admin/webhook-triggers/${triggerId}/actions`,
					{
						name: 'GET Request Action',
						action_type: 'outgoing_request',
						target_url: mock.url,
						request_method: 'GET',
						is_active: true,
						field_mappings: [
							{ source_path: 'search.term', target_key: 'q' },
							{ source_path: 'search.limit', target_key: 'limit' }
						],
						static_values: [{ key: 'format', value: 'json' }],
						target_headers: [{ key: 'X-Api-Key', value: 'key-abc' }]
					},
					auth()
				)
				actionId = aRes.data.action.id
			})

			it('sends a GET request with mapped fields as query parameters', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					search: { term: 'blue shoes', limit: 10 }
				})

				const req = mock.lastRequest()
				expect(req?.method).toBe('GET')
				expect(req?.query).toMatchObject({ q: 'blue shoes', limit: '10' })
			})

			it('includes static values as query parameters', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					search: { term: 'hat', limit: 5 }
				})

				const req = mock.lastRequest()
				expect(req?.query).toMatchObject({ format: 'json' })
			})

			it('sends no request body for GET', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					search: { term: 'boots', limit: 3 }
				})

				const req = mock.lastRequest()
				expect(req?.body).toBeNull()
			})

			it('forwards custom headers in the GET request', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					search: { term: 'gloves', limit: 2 }
				})

				const req = mock.lastRequest()
				expect(req?.headers['x-api-key']).toBe('key-abc')
			})

			it('creates a SUCCESS delivery record', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					search: { term: 'socks', limit: 1 }
				})

				const delRes = await api.get(
					`/admin/webhook-triggers/${triggerId}/actions/${actionId}/deliveries`,
					auth()
				)
				expect(delRes.data.deliveries.length).toBeGreaterThan(0)
				expect(delRes.data.deliveries[0].status).toBe('success')
			})
		})

		// ── Dispatch: outgoing_request DELETE ──────────────────────────────────

		describe('Dispatch: outgoing_request DELETE', () => {
			let triggerId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{
						name: 'Request DELETE Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				triggerId = tRes.data.trigger.id

				await api.post(
					`/admin/webhook-triggers/${triggerId}/actions`,
					{
						name: 'DELETE Request Action',
						action_type: 'outgoing_request',
						target_url: mock.url,
						request_method: 'DELETE',
						is_active: true,
						field_mappings: [{ source_path: 'record.id', target_key: 'id' }]
					},
					auth()
				)
			})

			it('sends a DELETE request with mapped fields as query parameters', async () => {
				await api.post(`/webhooks/${triggerId}`, { record: { id: 'rec_999' } })

				const req = mock.lastRequest()
				expect(req?.method).toBe('DELETE')
				expect(req?.query).toMatchObject({ id: 'rec_999' })
				expect(req?.body).toBeNull()
			})
		})

		// ── Incoming webhook logging (receipts) ─────────────────────────────────

		describe('Receipt logging', () => {
			let triggerId: string

			beforeAll(async () => {
				const res = await api.post(
					'/admin/webhook-triggers',
					{
						name: 'Log Trigger',
						trigger_type: 'incoming_webhook',
						log_incoming: true,
						is_active: true
					},
					auth()
				)
				triggerId = res.data.trigger.id
			})

			it('creates a receipt record when log_incoming is enabled', async () => {
				await api.post(`/webhooks/${triggerId}`, { hello: 'world' })

				const res = await api.get(`/admin/webhook-triggers/${triggerId}/receipts`, auth())
				expect(res.status).toBe(200)
				expect(res.data.receipts.length).toBeGreaterThan(0)
			})

			it('does not log receipts when log_incoming is disabled', async () => {
				const tRes = await api.post(
					'/admin/webhook-triggers',
					{
						name: 'No Log Trigger',
						trigger_type: 'incoming_webhook',
						log_incoming: false,
						is_active: true
					},
					auth()
				)
				const noLogId = tRes.data.trigger.id

				await api.post(`/webhooks/${noLogId}`, { hello: 'world' })

				const res = await api.get(`/admin/webhook-triggers/${noLogId}/receipts`, auth())
				expect(res.data.receipts).toHaveLength(0)
			})
		})
	}
})
