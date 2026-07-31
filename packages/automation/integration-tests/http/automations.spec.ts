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
import {
	ActionResponseSchema,
	ActionsResponseSchema,
	AutomationQueryResponseSchema,
	CreateSecretResponseSchema,
	DeleteQueryResponseSchema,
	DeleteResponseSchema,
	DeliveriesResponseSchema,
	ReceiptsResponseSchema,
	RetryDeliveriesResponseSchema,
	SecretsListResponseSchema,
	TriggerResponseSchema,
	TriggersResponseSchema
} from './response-contracts'

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
				allBodies: () => requests.map(r => r.body).filter((b): b is Record<string, unknown> => b !== null),
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
	dbName: 'medusa-automation',
	inApp: true,
	env: {},
	testSuite: ({ api, getContainer, dbUtils, utils }) => {
		const seedSnapshot = async () => {
			await utils.waitWorkflowExecutions()
			await dbUtils.snapshot()
		}
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
			await new Promise<void>((resolve, reject) => mock.server.close(err => (err ? reject(err) : resolve())))
		})

		beforeEach(() => mock.reset())

		// ── Trigger CRUD ────────────────────────────────────────────────────────

		describe('Trigger CRUD', () => {
			let triggerId: string

			beforeAll(async () => {
				// Per-test DB restore isolates tests, so seed a trigger the get/list/update tests can use
				const res = await api.post('/admin/automations', { name: 'CRUD Test Trigger', trigger_type: 'incoming_webhook', is_active: true }, auth())
				triggerId = res.data.trigger.id
				await seedSnapshot()
			})

			it('creates an incoming_webhook trigger', async () => {
				const res = await api.post(
					'/admin/automations',
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
				// Verifies AutomationTrigger / TriggerResponse (src/admin/types.ts)
				expect(() => TriggerResponseSchema.parse(res.data)).not.toThrow()
			})

			it('creates a medusa_event trigger', async () => {
				const res = await api.post(
					'/admin/automations',
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
				// Verifies AutomationTrigger / TriggerResponse, esp. a populated trigger_events array
				expect(() => TriggerResponseSchema.parse(res.data)).not.toThrow()
				// Note: intentionally not deleting here — the trigger persists but does not
				// affect other tests (each describe block creates its own triggers).
			})

			it('lists triggers', async () => {
				const res = await api.get('/admin/automations', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.triggers)).toBe(true)
				expect(res.data.count).toBeGreaterThan(0)
				// Verifies TriggersResponse (src/admin/types.ts)
				expect(() => TriggersResponseSchema.parse(res.data)).not.toThrow()
			})

			it('gets trigger by id', async () => {
				const res = await api.get(`/admin/automations/${triggerId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.trigger.id).toBe(triggerId)
				// Verifies TriggerResponse (src/admin/types.ts) — this route has no queryConfig,
				// the handler hand-builds the response by stripping trigger_signing_key and
				// deleted_at and adding has_signing_key.
				expect(() => TriggerResponseSchema.parse(res.data)).not.toThrow()
			})

			it('updates trigger', async () => {
				const res = await api.post(`/admin/automations/${triggerId}`, { description: 'Updated via test', is_active: false }, auth())
				expect(res.status).toBe(200)
				expect(res.data.trigger.description).toBe('Updated via test')
				expect(res.data.trigger.is_active).toBe(false)
				// Verifies TriggerResponse (src/admin/types.ts)
				expect(() => TriggerResponseSchema.parse(res.data)).not.toThrow()
			})

			it('deletes trigger', async () => {
				const res = await api.delete(`/admin/automations/${triggerId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(triggerId)
				// Verifies DeleteResponse (src/admin/types.ts)
				expect(() => DeleteResponseSchema.parse(res.data)).not.toThrow()
			})
		})

		// ── Action CRUD ─────────────────────────────────────────────────────────

		describe('Action CRUD', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const res = await api.post('/admin/automations', { name: 'Action CRUD Trigger', trigger_type: 'incoming_webhook', is_active: true }, auth())
				triggerId = res.data.trigger.id
				// Seed an action the list/update tests can use (per-test DB restore isolates tests)
				const actionRes = await api.post(
					`/admin/automations/${triggerId}/actions`,
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
				actionId = actionRes.data.action.id
				await seedSnapshot()
			})

			it('creates an outgoing_webhook action', async () => {
				const res = await api.post(
					`/admin/automations/${triggerId}/actions`,
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
				// Verifies AutomationAction / ActionResponse (src/admin/types.ts)
				expect(() => ActionResponseSchema.parse(res.data)).not.toThrow()
			})

			it('lists actions for trigger', async () => {
				const res = await api.get(`/admin/automations/${triggerId}/actions`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions).toHaveLength(1)
				expect(res.data.actions[0].id).toBe(actionId)
				// Verifies ActionsResponse (src/admin/types.ts)
				expect(() => ActionsResponseSchema.parse(res.data)).not.toThrow()
			})

			it('updates action', async () => {
				const res = await api.post(
					`/admin/automations/${triggerId}/actions/${actionId}`,
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
				// Verifies ActionResponse (src/admin/types.ts)
				expect(() => ActionResponseSchema.parse(res.data)).not.toThrow()

				const getRes = await api.get(`/admin/automations/${triggerId}/actions/${actionId}`, auth())
				// Verifies ActionResponse (src/admin/types.ts) — this route has no queryConfig,
				// the handler hand-builds the response by stripping deleted_at/trigger/query.
				expect(() => ActionResponseSchema.parse(getRes.data)).not.toThrow()
			})

			it('deletes action', async () => {
				const res = await api.delete(`/admin/automations/${triggerId}/actions/${actionId}`, auth())
				expect(res.status).toBe(200)
				// Verifies DeleteResponse (src/admin/types.ts)
				expect(() => DeleteResponseSchema.parse(res.data)).not.toThrow()

				// Verify gone
				const listRes = await api.get(`/admin/automations/${triggerId}/actions`, auth())
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
					api.post(
						'/admin/automations',
						{
							name: 'Filter: incoming active',
							trigger_type: 'incoming_webhook',
							is_active: true
						},
						auth()
					),
					api.post(
						'/admin/automations',
						{
							name: 'Filter: event active',
							trigger_type: 'medusa_event',
							trigger_events: ['order.placed'],
							is_active: true
						},
						auth()
					),
					api.post(
						'/admin/automations',
						{
							name: 'Filter: incoming inactive',
							trigger_type: 'incoming_webhook',
							is_active: false
						},
						auth()
					)
				])
				incomingTriggerId = t1.data.trigger.id
				eventTriggerId = t2.data.trigger.id
				inactiveTriggerId = t3.data.trigger.id

				// Trigger for action-level filter tests
				const tRes = await api.post('/admin/automations', { name: 'Filter: action parent', trigger_type: 'incoming_webhook', is_active: true }, auth())
				filterTriggerId = tRes.data.trigger.id

				const [a1, a2, a3] = await Promise.all([
					api.post(
						`/admin/automations/${filterTriggerId}/actions`,
						{
							name: 'Filter Action: outgoing active',
							action_type: 'outgoing_webhook',
							target_url: 'https://example.com',
							is_active: true
						},
						auth()
					),
					api.post(
						`/admin/automations/${filterTriggerId}/actions`,
						{
							name: 'Filter Action: workflow active',
							action_type: 'medusa_workflow',
							medusa_workflow: 'createOrderWorkflow',
							is_active: true
						},
						auth()
					),
					api.post(
						`/admin/automations/${filterTriggerId}/actions`,
						{
							name: 'Filter Action: outgoing inactive',
							action_type: 'outgoing_webhook',
							target_url: 'https://example.com',
							is_active: false
						},
						auth()
					)
				])
				outgoingActionId = a1.data.action.id
				workflowActionId = a2.data.action.id
				inactiveActionId = a3.data.action.id
				await seedSnapshot()
			})

			// ── Trigger filters ────────────────────────────────────────────────────

			it('GET /admin/automations filters by q (name search)', async () => {
				const res = await api.get('/admin/automations?q=Filter%3A+incoming', auth())
				expect(res.status).toBe(200)
				expect(res.data.triggers.length).toBeGreaterThanOrEqual(1)
				expect(res.data.triggers.every((t: any) => t.name.includes('Filter: incoming'))).toBe(true)
			})

			it('GET /admin/automations filters by trigger_type=incoming_webhook', async () => {
				const res = await api.get('/admin/automations?trigger_type=incoming_webhook', auth())
				expect(res.status).toBe(200)
				expect(res.data.triggers.every((t: any) => t.trigger_type === 'incoming_webhook')).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === incomingTriggerId)).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === eventTriggerId)).toBe(false)
			})

			it('GET /admin/automations filters by trigger_type=medusa_event', async () => {
				const res = await api.get('/admin/automations?trigger_type=medusa_event', auth())
				expect(res.status).toBe(200)
				expect(res.data.triggers.every((t: any) => t.trigger_type === 'medusa_event')).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === eventTriggerId)).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === incomingTriggerId)).toBe(false)
			})

			it('GET /admin/automations filters by is_active=true', async () => {
				const res = await api.get('/admin/automations?is_active=true', auth())
				expect(res.status).toBe(200)
				expect(res.data.triggers.every((t: any) => t.is_active === true)).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === inactiveTriggerId)).toBe(false)
			})

			it('GET /admin/automations filters by is_active=false', async () => {
				const res = await api.get('/admin/automations?is_active=false', auth())
				expect(res.status).toBe(200)
				expect(res.data.triggers.every((t: any) => t.is_active === false)).toBe(true)
				expect(res.data.triggers.some((t: any) => t.id === inactiveTriggerId)).toBe(true)
			})

			// ── Action filters ─────────────────────────────────────────────────────

			it('GET /admin/automations/:id/actions filters by action_type=outgoing_webhook', async () => {
				const res = await api.get(`/admin/automations/${filterTriggerId}/actions?action_type=outgoing_webhook`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions.every((a: any) => a.action_type === 'outgoing_webhook')).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === outgoingActionId)).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === workflowActionId)).toBe(false)
			})

			it('GET /admin/automations/:id/actions filters by action_type=medusa_workflow', async () => {
				const res = await api.get(`/admin/automations/${filterTriggerId}/actions?action_type=medusa_workflow`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions.every((a: any) => a.action_type === 'medusa_workflow')).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === workflowActionId)).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === outgoingActionId)).toBe(false)
			})

			it('GET /admin/automations/:id/actions filters by is_active=true', async () => {
				const res = await api.get(`/admin/automations/${filterTriggerId}/actions?is_active=true`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions.every((a: any) => a.is_active === true)).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === inactiveActionId)).toBe(false)
			})

			it('GET /admin/automations/:id/actions filters by is_active=false', async () => {
				const res = await api.get(`/admin/automations/${filterTriggerId}/actions?is_active=false`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions.every((a: any) => a.is_active === false)).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === inactiveActionId)).toBe(true)
				expect(res.data.actions.some((a: any) => a.id === outgoingActionId)).toBe(false)
			})

			// ── Delivery filters ───────────────────────────────────────────────────

			it('GET deliveries filters by status=success', async () => {
				// Create a trigger+action pointing at mock.url to ensure a success delivery
				const tRes = await api.post(
					'/admin/automations',
					{
						name: 'Delivery Filter Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				const tid = tRes.data.trigger.id
				const aRes = await api.post(
					`/admin/automations/${tid}/actions`,
					{
						name: 'Delivery Filter Action',
						action_type: 'outgoing_webhook',
						target_url: mock.url,
						is_active: true
					},
					auth()
				)
				const aid = aRes.data.action.id

				// Fire to create a success delivery
				await api.post(`/webhooks/${tid}`, { hello: 'world' })

				const res = await api.get(`/admin/automations/${tid}/actions/${aid}/deliveries?status=success`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deliveries.length).toBeGreaterThan(0)
				expect(res.data.deliveries.every((d: any) => d.status === 'success')).toBe(true)
			})

			it('GET deliveries filters by status=failed returns empty when all succeeded', async () => {
				const tRes = await api.post(
					'/admin/automations',
					{
						name: 'Delivery Failed Filter Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				const tid = tRes.data.trigger.id
				const aRes = await api.post(
					`/admin/automations/${tid}/actions`,
					{
						name: 'Delivery Failed Action',
						action_type: 'outgoing_webhook',
						target_url: mock.url,
						is_active: true
					},
					auth()
				)
				const aid = aRes.data.action.id

				await api.post(`/webhooks/${tid}`, { hello: 'world' })

				const res = await api.get(`/admin/automations/${tid}/actions/${aid}/deliveries?status=failed`, auth())
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
					'/admin/automations',
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
					`/admin/automations/${triggerId}/actions`,
					{
						name: 'Query Action',
						action_type: 'outgoing_webhook',
						target_url: 'https://example.com',
						is_active: true
					},
					auth()
				)
				actionId = aRes.data.action.id
				await seedSnapshot()
			})

			const queryUrl = () => `/admin/automations/${triggerId}/actions/${actionId}/query`

			it('returns null when no query config exists', async () => {
				const res = await api.get(queryUrl(), auth())
				expect(res.status).toBe(200)
				expect(res.data.query).toBeNull()
				// Verifies AutomationQueryResponse (src/admin/types.ts)
				expect(() => AutomationQueryResponseSchema.parse(res.data)).not.toThrow()
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
				// Verifies AutomationQueryResponse (src/admin/types.ts)
				expect(() => AutomationQueryResponseSchema.parse(res.data)).not.toThrow()
			})

			it('upserts (updates) an existing query config', async () => {
				const res = await api.post(queryUrl(), { entity_name: 'order', fields: ['id', 'total'], limit: 5 }, auth())
				expect(res.status).toBe(200)
				expect(res.data.query.entity_name).toBe('order')
				expect(res.data.query.limit).toBe(5)
				// Verifies AutomationQueryResponse (src/admin/types.ts)
				expect(() => AutomationQueryResponseSchema.parse(res.data)).not.toThrow()
			})

			it('clamps limit to 100', async () => {
				const res = await api.post(queryUrl(), { entity_name: 'customer', limit: 9999 }, auth())
				expect(res.data.query.limit).toBe(100)
			})

			it('deletes the query config', async () => {
				const delRes = await api.delete(queryUrl(), auth())
				// Verifies DeleteQueryResponse (src/admin/types.ts) — `{ deleted: boolean }`,
				// distinct from the trigger/action/secret delete routes' `{ deleted: string[] }`.
				expect(() => DeleteQueryResponseSchema.parse(delRes.data)).not.toThrow()
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
					'/admin/automations',
					{
						name: 'Signed Trigger',
						trigger_type: 'incoming_webhook',
						trigger_signing_key: signingKey,
						is_active: true
					},
					auth()
				)
				triggerId = res.data.trigger.id
				await seedSnapshot()
			})

			it('returns 404 for an unknown trigger id', async () => {
				const res = await api.post('/webhooks/nonexistent-id-xyz', { foo: 'bar' }).catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('returns 404 when trigger is inactive', async () => {
				// Create a dedicated inactive trigger (avoids touching the signed one)
				const tRes = await api.post('/admin/automations', { name: 'Inactive Trigger', trigger_type: 'incoming_webhook', is_active: false }, auth())
				const id = tRes.data.trigger.id

				const res = await api.post(`/webhooks/${id}`, { foo: 'bar' }).catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('returns 401 when signing key is required but header is missing', async () => {
				const res = await api.post(`/webhooks/${triggerId}`, { foo: 'bar' }).catch((e: any) => e.response)
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

		// ── Configurable signature schemes (GitHub / Slack-style) ──────────────

		describe('Configurable signature schemes', () => {
			it('verifies a GitHub-style signature (X-Hub-Signature-256: sha256=<hex>)', async () => {
				const key = 'gh-key'
				const tRes = await api.post(
					'/admin/automations',
					{
						name: 'GitHub Trigger',
						trigger_type: 'incoming_webhook',
						trigger_signing_key: key,
						signature_config: {
							header: 'X-Hub-Signature-256',
							prefix: 'sha256=',
							encoding: 'hex'
						},
						is_active: true
					},
					auth()
				)
				const tid = tRes.data.trigger.id

				const body = { hello: 'world' }
				const raw = JSON.stringify(body)
				const sig = 'sha256=' + createHmac('sha256', key).update(raw).digest('hex')

				const ok = await api.post(`/webhooks/${tid}`, body, {
					headers: { 'X-Hub-Signature-256': sig }
				})
				expect(ok.status).toBe(200)

				const bad = await api
					.post(`/webhooks/${tid}`, body, {
						headers: { 'X-Hub-Signature-256': 'sha256=deadbeef' }
					})
					.catch((e: any) => e.response)
				expect(bad.status).toBe(401)
			})

			it('verifies a Slack-style signature (v0=<hex> over v0:ts:body, with replay window)', async () => {
				const key = 'slack-key'
				const tRes = await api.post(
					'/admin/automations',
					{
						name: 'Slack Trigger',
						trigger_type: 'incoming_webhook',
						trigger_signing_key: key,
						signature_config: {
							header: 'X-Slack-Signature',
							prefix: 'v0=',
							encoding: 'hex',
							template: 'v0:{ts}:{body}',
							timestamp_header: 'X-Slack-Request-Timestamp',
							tolerance_seconds: 300
						},
						is_active: true
					},
					auth()
				)
				const tid = tRes.data.trigger.id

				const body = { event: 'message' }
				const raw = JSON.stringify(body)
				const ts = String(Math.floor(Date.now() / 1000))
				const sig = 'v0=' + createHmac('sha256', key).update(`v0:${ts}:${raw}`).digest('hex')

				const ok = await api.post(`/webhooks/${tid}`, body, {
					headers: { 'X-Slack-Signature': sig, 'X-Slack-Request-Timestamp': ts }
				})
				expect(ok.status).toBe(200)
			})

			it('rejects requests outside the replay tolerance window', async () => {
				const key = 'replay-key'
				const tRes = await api.post(
					'/admin/automations',
					{
						name: 'Replay Trigger',
						trigger_type: 'incoming_webhook',
						trigger_signing_key: key,
						signature_config: {
							template: 'v0:{ts}:{body}',
							timestamp_header: 'X-Timestamp',
							tolerance_seconds: 60
						},
						is_active: true
					},
					auth()
				)
				const tid = tRes.data.trigger.id

				const body = { foo: 'old' }
				const raw = JSON.stringify(body)
				const staleTs = String(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
				const sig = createHmac('sha256', key).update(`v0:${staleTs}:${raw}`).digest('hex')

				const bad = await api
					.post(`/webhooks/${tid}`, body, {
						headers: { 'x-webhook-signature': sig, 'X-Timestamp': staleTs }
					})
					.catch((e: any) => e.response)
				expect(bad.status).toBe(401)
				expect(bad.data.error).toMatch(/tolerance|timestamp/i)
			})

			it('returns 401 when GitHub-style prefix is missing from header value', async () => {
				const key = 'prefix-key'
				const tRes = await api.post(
					'/admin/automations',
					{
						name: 'Prefix Trigger',
						trigger_type: 'incoming_webhook',
						trigger_signing_key: key,
						signature_config: { prefix: 'sha256=' },
						is_active: true
					},
					auth()
				)
				const tid = tRes.data.trigger.id

				const body = { foo: 'bar' }
				const sig = createHmac('sha256', key).update(JSON.stringify(body)).digest('hex')

				// No 'sha256=' prefix → expected prefix mismatch
				const bad = await api.post(`/webhooks/${tid}`, body, { headers: { 'x-webhook-signature': sig } }).catch((e: any) => e.response)
				expect(bad.status).toBe(401)
				expect(bad.data.error).toMatch(/prefix/i)
			})
		})

		// ── SSRF save-time validation (end-to-end wiring) ──────────────────────
		//
		// IP-level rejection (private/reserved) is covered by the unit suite
		// in src/lib/__tests__/ssrf.unit.spec.ts — the integration test
		// backend runs with allowPrivateIps + http enabled so it can talk to
		// the localhost mock server. These tests just verify the save-time
		// wiring fires.

		describe('SSRF save-time validation', () => {
			let triggerId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/automations',
					{
						name: 'SSRF Save-Time Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				triggerId = tRes.data.trigger.id
				await seedSnapshot()
			})

			it('rejects file:// URLs at action create (scheme not in allowlist)', async () => {
				const bad = await api
					.post(
						`/admin/automations/${triggerId}/actions`,
						{
							name: 'File Scheme Action',
							action_type: 'outgoing_webhook',
							target_url: 'file:///etc/passwd',
							is_active: true
						},
						auth()
					)
					.catch((e: any) => e.response)
				expect(bad.status).toBe(400)
				expect(JSON.stringify(bad.data)).toMatch(/scheme|allowed/i)
			})

			it('rejects malformed URLs at the validator layer', async () => {
				const bad = await api
					.post(
						`/admin/automations/${triggerId}/actions`,
						{
							name: 'Bad URL Action',
							action_type: 'outgoing_webhook',
							target_url: 'not-a-url',
							is_active: true
						},
						auth()
					)
					.catch((e: any) => e.response)
				expect(bad.status).toBe(400)
			})

			it('accepts a valid http target_url (test config allows http)', async () => {
				const ok = await api.post(
					`/admin/automations/${triggerId}/actions`,
					{
						name: 'Valid HTTP Action',
						action_type: 'outgoing_webhook',
						target_url: 'http://example.com/hook',
						is_active: true
					},
					auth()
				)
				expect(ok.status).toBe(200)
			})
		})

		// ── Workflow guard (save-time end-to-end) ──────────────────────────────

		describe('Workflow guard save-time validation', () => {
			let triggerId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/automations',
					{
						name: 'Workflow Guard Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				triggerId = tRes.data.trigger.id
				await seedSnapshot()
			})

			it('rejects creating a medusa_workflow action whose workflow name contains "delete"', async () => {
				const bad = await api
					.post(
						`/admin/automations/${triggerId}/actions`,
						{
							name: 'Destructive Action',
							action_type: 'medusa_workflow',
							medusa_workflow: 'deleteCustomersWorkflow',
							is_active: true
						},
						auth()
					)
					.catch((e: any) => e.response)
				expect(bad.status).toBe(400)
				expect(JSON.stringify(bad.data)).toMatch(/delete|blocked|destructive/i)
			})

			it('still allows non-destructive workflows (e.g. createCustomersWorkflow)', async () => {
				const ok = await api.post(
					`/admin/automations/${triggerId}/actions`,
					{
						name: 'Safe Workflow Action',
						action_type: 'medusa_workflow',
						medusa_workflow: 'createCustomersWorkflow',
						is_active: true
					},
					auth()
				)
				expect(ok.status).toBe(200)
			})
		})

		// ── Dispatch: outgoing webhook ──────────────────────────────────────────

		describe('Dispatch: outgoing webhook', () => {
			let triggerId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/automations',
					{
						name: 'Outgoing Dispatch Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				triggerId = tRes.data.trigger.id

				await api.post(
					`/admin/automations/${triggerId}/actions`,
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
				await seedSnapshot()
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
				expect(mock.lastBody()).toEqual(expect.objectContaining({ email: 'b@test.com', full_name: 'Bob Jones' }))
			})

			it('merges static values into the outgoing payload', async () => {
				await api.post(`/webhooks/${triggerId}`, {
					customer: { email: 'c@test.com', name: 'Carol' }
				})

				expect(mock.lastBody()).toEqual(expect.objectContaining({ source: 'medusa', version: '2' }))
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

				const actionsRes = await api.get(`/admin/automations/${triggerId}/actions`, auth())
				const actionId = actionsRes.data.actions[0].id

				const delRes = await api.get(`/admin/automations/${triggerId}/actions/${actionId}/deliveries`, auth())
				expect(delRes.status).toBe(200)
				expect(delRes.data.deliveries.length).toBeGreaterThan(0)
				expect(delRes.data.deliveries[0].status).toBe('success')
				// Verifies DeliveriesResponse (src/admin/types.ts)
				expect(() => DeliveriesResponseSchema.parse(delRes.data)).not.toThrow()

				const retryRes = await api.post(
					`/admin/automations/${triggerId}/actions/${actionId}/deliveries/retry`,
					{ delivery_ids: [delRes.data.deliveries[0].id] },
					auth()
				)
				expect(retryRes.status).toBe(200)
				expect(retryRes.data.retried).toBe(1)
				// Verifies RetryDeliveriesResponse (src/admin/types.ts)
				expect(() => RetryDeliveriesResponseSchema.parse(retryRes.data)).not.toThrow()
			})

			it('creates a FAILED delivery record when target URL is unreachable', async () => {
				// Create a trigger pointing at port 1 (always refused)
				const tRes = await api.post('/admin/automations', { name: 'Fail Trigger', trigger_type: 'incoming_webhook', is_active: true }, auth())
				const failTriggerId = tRes.data.trigger.id

				const aRes = await api.post(
					`/admin/automations/${failTriggerId}/actions`,
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

				const delRes = await api.get(`/admin/automations/${failTriggerId}/actions/${failActionId}/deliveries`, auth())
				const failed = delRes.data.deliveries.find((d: any) => d.status === 'failed')
				expect(failed).toMatchObject({
					status: 'failed',
					id: expect.any(String)
				})
				// Verifies DeliveriesResponse (src/admin/types.ts), esp. a failed delivery's
				// nullable response_status/response_body and a populated error_message
				expect(() => DeliveriesResponseSchema.parse(delRes.data)).not.toThrow()
			})
		})

		// ── Dispatch: workflow — array coercion ─────────────────────────────────

		describe('Dispatch: workflow — array coercion (single object → array)', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const tRes = await api.post('/admin/automations', { name: 'Coercion Trigger', trigger_type: 'incoming_webhook', is_active: true }, auth())
				triggerId = tRes.data.trigger.id

				// Map `customer` (single object) → `customersData[]` (array field)
				// The [] target suffix signals: coerce to array if not already one
				const aRes = await api.post(
					`/admin/automations/${triggerId}/actions`,
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
				await seedSnapshot()
			})

			it('coerces a single object to an array and runs the workflow once', async () => {
				const uniqueEmail = `coerce-${Date.now()}@test.com`

				const dispatchRes = await api.post(`/webhooks/${triggerId}`, {
					customer: { email: uniqueEmail, first_name: 'Coerce', last_name: 'Test' }
				})
				expect(dispatchRes.status).toBe(200)

				// Verify delivery was recorded as success
				const delRes = await api.get(`/admin/automations/${triggerId}/actions/${actionId}/deliveries`, auth())
				expect(delRes.data.deliveries[0].status).toBe('success')

				// Verify customer was actually created
				const custRes = await api.get(`/admin/customers?q=${encodeURIComponent(uniqueEmail)}`, auth())
				expect(custRes.data.customers.length).toBe(1)
				expect(custRes.data.customers[0].email).toBe(uniqueEmail)
			})
		})

		// ── Dispatch: workflow — fan-out ────────────────────────────────────────

		describe('Dispatch: workflow — fan-out ([] in source path)', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const tRes = await api.post('/admin/automations', { name: 'Fanout Trigger', trigger_type: 'incoming_webhook', is_active: true }, auth())
				triggerId = tRes.data.trigger.id

				// Map `customers[].email` → `customersData[].email` etc.
				// The [] in the SOURCE triggers fan-out: run workflow once per customer.
				const aRes = await api.post(
					`/admin/automations/${triggerId}/actions`,
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
				await seedSnapshot()
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
				const delRes = await api.get(`/admin/automations/${triggerId}/actions/${actionId}/deliveries`, auth())
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
					'/admin/automations',
					{
						name: 'Request Action CRUD Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				triggerId = res.data.trigger.id
				// Seed an outgoing_request action the list/update tests can use (per-test DB restore isolates tests)
				const actionRes = await api.post(
					`/admin/automations/${triggerId}/actions`,
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
				actionId = actionRes.data.action.id
				await seedSnapshot()
			})

			it('creates an outgoing_request action with request_method', async () => {
				const res = await api.post(
					`/admin/automations/${triggerId}/actions`,
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
			})

			it('lists the outgoing_request action', async () => {
				const res = await api.get(`/admin/automations/${triggerId}/actions`, auth())
				expect(res.status).toBe(200)
				expect(res.data.actions).toHaveLength(1)
				expect(res.data.actions[0].action_type).toBe('outgoing_request')
			})

			it('updates request_method on an outgoing_request action', async () => {
				const res = await api.post(
					`/admin/automations/${triggerId}/actions/${actionId}`,
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
				const res = await api.delete(`/admin/automations/${triggerId}/actions/${actionId}`, auth())
				expect(res.status).toBe(200)

				const listRes = await api.get(`/admin/automations/${triggerId}/actions`, auth())
				expect(listRes.data.actions).toHaveLength(0)
			})
		})

		// ── Dispatch: outgoing_request POST ────────────────────────────────────

		describe('Dispatch: outgoing_request POST', () => {
			let triggerId: string
			let actionId: string

			beforeAll(async () => {
				const tRes = await api.post('/admin/automations', { name: 'Request POST Trigger', trigger_type: 'incoming_webhook', is_active: true }, auth())
				triggerId = tRes.data.trigger.id

				const aRes = await api.post(
					`/admin/automations/${triggerId}/actions`,
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
				await seedSnapshot()
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

				const delRes = await api.get(`/admin/automations/${triggerId}/actions/${actionId}/deliveries`, auth())
				expect(delRes.data.deliveries.length).toBeGreaterThan(0)
				expect(delRes.data.deliveries[0].status).toBe('success')
			})
		})

		// ── Dispatch: outgoing_request PUT ─────────────────────────────────────

		describe('Dispatch: outgoing_request PUT', () => {
			let triggerId: string

			beforeAll(async () => {
				const tRes = await api.post('/admin/automations', { name: 'Request PUT Trigger', trigger_type: 'incoming_webhook', is_active: true }, auth())
				triggerId = tRes.data.trigger.id

				await api.post(
					`/admin/automations/${triggerId}/actions`,
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
				await seedSnapshot()
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
				const tRes = await api.post('/admin/automations', { name: 'Request GET Trigger', trigger_type: 'incoming_webhook', is_active: true }, auth())
				triggerId = tRes.data.trigger.id

				const aRes = await api.post(
					`/admin/automations/${triggerId}/actions`,
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
				await seedSnapshot()
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

				const delRes = await api.get(`/admin/automations/${triggerId}/actions/${actionId}/deliveries`, auth())
				expect(delRes.data.deliveries.length).toBeGreaterThan(0)
				expect(delRes.data.deliveries[0].status).toBe('success')
			})
		})

		// ── Dispatch: outgoing_request DELETE ──────────────────────────────────

		describe('Dispatch: outgoing_request DELETE', () => {
			let triggerId: string

			beforeAll(async () => {
				const tRes = await api.post(
					'/admin/automations',
					{
						name: 'Request DELETE Trigger',
						trigger_type: 'incoming_webhook',
						is_active: true
					},
					auth()
				)
				triggerId = tRes.data.trigger.id

				await api.post(
					`/admin/automations/${triggerId}/actions`,
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
				await seedSnapshot()
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
					'/admin/automations',
					{
						name: 'Log Trigger',
						trigger_type: 'incoming_webhook',
						log_incoming: true,
						is_active: true
					},
					auth()
				)
				triggerId = res.data.trigger.id
				await seedSnapshot()
			})

			it('creates a receipt record when log_incoming is enabled', async () => {
				await api.post(`/webhooks/${triggerId}`, { hello: 'world' })

				const res = await api.get(`/admin/automations/${triggerId}/receipts`, auth())
				expect(res.status).toBe(200)
				expect(res.data.receipts.length).toBeGreaterThan(0)
				// Verifies ReceiptsResponse (src/admin/types.ts)
				expect(() => ReceiptsResponseSchema.parse(res.data)).not.toThrow()
			})

			it('does not log receipts when log_incoming is disabled', async () => {
				const tRes = await api.post(
					'/admin/automations',
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

				const res = await api.get(`/admin/automations/${noLogId}/receipts`, auth())
				expect(res.data.receipts).toHaveLength(0)
			})
		})

		// ── Secrets ─────────────────────────────────────────────────────────────

		describe('Secrets', () => {
			it('creates a secret and returns the plaintext value exactly once', async () => {
				const res = await api.post('/admin/automations/secrets', { label: 'CRUD Test Secret' }, auth())
				expect(res.status).toBe(200)
				expect(res.data.secret).toMatchObject({ label: 'CRUD Test Secret' })
				expect(typeof res.data.secret.secret).toBe('string')
				expect(res.data.secret.secret.length).toBeGreaterThan(0)
				// Verifies CreateSecretResponse (src/admin/types.ts) — the ONE route allowed to
				// return the plaintext secret value; z.strictObject also means it can't leak
				// anything beyond id/label/secret/created_at (e.g. the encrypted `secret` column
				// stored on the entity, or `updated_at`/`deleted_at`).
				expect(() => CreateSecretResponseSchema.parse(res.data)).not.toThrow()
			})

			it('lists secrets without ever leaking the secret value', async () => {
				const created = await api.post('/admin/automations/secrets', { label: 'List Test Secret' }, auth())
				const secretId = created.data.secret.id

				const res = await api.get('/admin/automations/secrets', auth())
				expect(res.status).toBe(200)
				expect(res.data.secrets.some((s: any) => s.id === secretId)).toBe(true)
				// SECURITY: the list route must never return the plaintext or encrypted secret value.
				for (const s of res.data.secrets) {
					expect(s).not.toHaveProperty('secret')
				}
				// Verifies SecretsListResponse (src/admin/types.ts) — z.strictObject makes the
				// security check above load-bearing: AutomationSecretSchema has no `secret` field,
				// so a route that started leaking it would fail this parse too.
				expect(() => SecretsListResponseSchema.parse(res.data)).not.toThrow()
			})

			it('deletes a secret', async () => {
				const created = await api.post('/admin/automations/secrets', { label: 'Delete Test Secret' }, auth())
				const secretId = created.data.secret.id

				const res = await api.delete(`/admin/automations/secrets/${secretId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(secretId)
				// Verifies DeleteResponse (src/admin/types.ts)
				expect(() => DeleteResponseSchema.parse(res.data)).not.toThrow()

				const listRes = await api.get('/admin/automations/secrets', auth())
				expect(listRes.data.secrets.some((s: any) => s.id === secretId)).toBe(false)
			})
		})
	}
})
