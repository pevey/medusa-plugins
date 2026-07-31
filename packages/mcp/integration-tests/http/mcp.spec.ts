/**
 * Integration tests for the mcp plugin's admin HTTP surface: the MCP protocol
 * endpoint and the chat-session routes.
 *
 * MCP protocol (`POST /admin/mcp`):
 * - Auth guard, and the intentional 405s on GET/DELETE.
 * - Accept-header and JSON-vs-SSE response-framing contracts.
 * - Statelessness: no session id is minted, and `tools/list` succeeds on a
 *   bare POST with no prior `initialize` on the connection.
 * - Tool advertisement (identity, capabilities, deterministic ordering,
 *   read-only-by-default gating) and tool execution + error handling.
 *
 * Chat sessions:
 * - Admin route auth guard.
 * - Session CRUD (list/load/delete) with per-admin ownership: a session
 *   belonging to admin A is invisible to admin B (404, never 403).
 * - List ordering by `last_message_at` DESC.
 * - Delete cascades to the session's messages.
 * - Retention purge removes stale sessions (and cascades to messages) while
 *   keeping fresh ones.
 *
 * Seeding note (test-utils >= 2.17.0 DB templating): the runner snapshots the
 * DB template on the FIRST test and restores from it before every later test.
 * Data seeded in a `beforeAll` that runs after that first snapshot is wiped by
 * the restore unless re-captured via `dbUtils.snapshot()` (see `setupAdmin`
 * callers below). To sidestep the restore-between-tests semantics entirely,
 * the chat-session describe blocks below do their seeding + assertions inside a
 * single `it` so no state needs to survive a restore boundary.
 *
 * The MCP protocol block is the exception, and safely so: it spreads its
 * assertions across many small `it`s because it seeds nothing beyond the admin
 * user created in its `beforeAll` (captured with `dbUtils.snapshot()`, so it
 * survives every restore) and asserts only against protocol-level behaviour
 * that does not depend on store data.
 *
 * Run with:
 *   yarn workspace medusa-plugin-mcp test:integration:http
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import { MCP_MODULE } from '../../src/modules/mcp'
import {
	ChatErrorResponseSchema,
	ChatSessionDeleteResponseSchema,
	ChatSessionDetailResponseSchema,
	ChatSessionsListResponseSchema,
	JsonRpcErrorResponseSchema,
	LegacyCallToolResultSchema,
	LegacyInitializeResultSchema,
	LegacyToolsListResultSchema,
	ModernCallToolResultSchema,
	ModernDiscoverResultSchema,
	ModernToolsListResultSchema
} from './response-contracts'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa-mcp',
	inApp: true,
	env: {},
	testSuite: ({ api, getContainer, dbUtils, utils }) => {
		// Register + create an admin user and log in. Returns the user id + bearer token.
		// Mirrors packages/access/integration-tests/http/access.spec.ts `setupAdmin`.
		const setupAdmin = async (email: string): Promise<{ userId: string; token: string }> => {
			const container = getContainer()
			const authService: any = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email, password: 'Sup3rSecret!' }
			})
			const { result: user } = await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: { email, first_name: 'Test', last_name: 'Admin' }
				}
			})
			const login = await api.post('/auth/user/emailpass', { email, password: 'Sup3rSecret!' })
			return { userId: user.id, token: login.data.token }
		}
		const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })

		describe('Auth', () => {
			it('401 without token', async () => {
				const res = await api.get('/admin/chat/sessions').catch((e: any) => e.response)
				expect(res.status).toBe(401)
			})
		})

		describe('Session CRUD + ownership', () => {
			let adminA: { userId: string; token: string }
			let adminB: { userId: string; token: string }

			beforeAll(async () => {
				adminA = await setupAdmin('mcp-admin-a@example.com')
				adminB = await setupAdmin('mcp-admin-b@example.com')
				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			it("lists only the caller's sessions in last_message_at DESC order, isolates ownership on load/delete, and cascades message deletes", async () => {
				const container = getContainer()
				const mcp: any = container.resolve(MCP_MODULE)
				const now = Date.now()

				const sessionA1 = await mcp.createChatSessions({
					user_id: adminA.userId,
					title: 'Older A chat',
					last_message_at: new Date(now - 120_000)
				})
				const sessionA2 = await mcp.createChatSessions({
					user_id: adminA.userId,
					title: 'Newer A chat',
					last_message_at: new Date(now - 1_000)
				})
				const sessionB1 = await mcp.createChatSessions({
					user_id: adminB.userId,
					title: 'B chat',
					last_message_at: new Date(now)
				})

				await mcp.createChatMessages({
					session_id: sessionA1.id,
					role: 'user',
					content: [{ type: 'text', text: 'Hello' }],
					created_at: new Date(now - 120_000)
				})
				await mcp.createChatMessages({
					session_id: sessionA1.id,
					role: 'assistant',
					content: [{ type: 'text', text: 'Hi there' }],
					created_at: new Date(now - 119_000)
				})

				// --- list: ownership scoping + ordering ---
				const listA = await api.get('/admin/chat/sessions', auth(adminA.token))
				expect(listA.status).toBe(200)
				expect(listA.data.sessions.map((s: any) => s.id)).toEqual([sessionA2.id, sessionA1.id])
				// Response contract: GET /admin/chat/sessions -> SessionsListResponse
				expect(() => ChatSessionsListResponseSchema.parse(listA.data)).not.toThrow()

				const listB = await api.get('/admin/chat/sessions', auth(adminB.token))
				expect(listB.status).toBe(200)
				expect(listB.data.sessions.map((s: any) => s.id)).toEqual([sessionB1.id])
				expect(() => ChatSessionsListResponseSchema.parse(listB.data)).not.toThrow()

				// --- load: cross-owner is 404, never 403 ---
				const loadForeign = await api.get(`/admin/chat/sessions/${sessionA1.id}`, auth(adminB.token)).catch((e: any) => e.response)
				expect(loadForeign.status).toBe(404)
				// Response contract: the plugin's own 404 error envelope
				expect(() => ChatErrorResponseSchema.parse(loadForeign.data)).not.toThrow()

				const loadOwn = await api.get(`/admin/chat/sessions/${sessionA1.id}`, auth(adminA.token))
				expect(loadOwn.status).toBe(200)
				expect(loadOwn.data.session).toEqual({ id: sessionA1.id, title: 'Older A chat' })
				expect(loadOwn.data.messages).toEqual([
					{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
					{ role: 'assistant', content: [{ type: 'text', text: 'Hi there' }] }
				])
				// Response contract: GET /admin/chat/sessions/:id -> SessionDetailResponse
				expect(() => ChatSessionDetailResponseSchema.parse(loadOwn.data)).not.toThrow()

				// --- delete: cross-owner is 404, never 403; cascades to messages ---
				const deleteForeign = await api.delete(`/admin/chat/sessions/${sessionA1.id}`, auth(adminB.token)).catch((e: any) => e.response)
				expect(deleteForeign.status).toBe(404)
				expect(() => ChatErrorResponseSchema.parse(deleteForeign.data)).not.toThrow()

				const deleteOwn = await api.delete(`/admin/chat/sessions/${sessionA1.id}`, auth(adminA.token))
				expect(deleteOwn.status).toBe(200)
				expect(deleteOwn.data).toEqual({ id: sessionA1.id, deleted: true })
				// Response contract: DELETE /admin/chat/sessions/:id -> DeleteSessionResponse
				expect(() => ChatSessionDeleteResponseSchema.parse(deleteOwn.data)).not.toThrow()

				const remainingSessions = await mcp.listChatSessions({ id: sessionA1.id })
				expect(remainingSessions).toHaveLength(0)
				const remainingMessages = await mcp.listChatMessages({ session_id: sessionA1.id })
				expect(remainingMessages).toHaveLength(0)
			})
		})

		// ── MCP protocol surface ───────────────────────────────────────────────
		//
		// `POST /admin/mcp` runs on MCP SDK v2, which serves TWO protocol eras from
		// the single endpoint, and the two are genuinely different on the wire. The
		// blocks below are split accordingly, because a test that passed for one
		// era would say nothing about the other:
		//
		//   legacy (2025-11-25) — what every MCP client shipping today speaks.
		//     Has the `initialize` handshake. Replies are SSE-framed. Results are
		//     bare (no `resultType`, no cache fields).
		//   modern (2026-07-28) — no handshake at all; every request carries its
		//     protocol version and client capabilities in `params._meta`, and must
		//     name its method in an `Mcp-Method` header (plus `Mcp-Name` for
		//     `tools/call`) so proxies can route without parsing the body. Replies
		//     are plain JSON. Results carry `resultType`, a `_meta` server identity,
		//     and — on list-class results — `ttlMs` + `cacheScope`.
		//
		// Keeping legacy coverage is the point of the `legacy: 'stateless'` option
		// in the route: dropping it would break every current client on the day
		// this deploys, and only a test that speaks 2025-11-25 would notice.
		//
		// Statelessness is no longer something this plugin arranges — 2026-07-28
		// removed protocol sessions outright, and `createMcpHandler` runs its
		// factory once per request by construction. What is still worth asserting
		// is the observable consequence: no session id is ever minted, and a bare
		// request works with nothing established beforehand.
		describe('MCP protocol surface', () => {
			// The SDK rejects any POST whose Accept header does not list BOTH types.
			const MCP_ACCEPT = 'application/json, text/event-stream'

			// Registration order in `resolveMcpTools`: query, orders, customers,
			// products, inventory. Asserted as an ordered array, not a set --
			// 2026-07-28 adds a SHOULD that servers return tools in a deterministic
			// order so clients can cache and LLM prompt caches hit.
			const BUILT_IN_TOOLS = [
				'query',
				'recent_orders',
				'get_order',
				'search_customers',
				'get_customer',
				'search_products',
				'get_product',
				'low_stock_items',
				'get_inventory_item'
			]

			let admin: { userId: string; token: string }

			beforeAll(async () => {
				admin = await setupAdmin('mcp-protocol-admin@example.com')
				await utils.waitWorkflowExecutions()
				await dbUtils.snapshot()
			})

			// A legacy (2025-era) call: no `_meta` envelope, no routing headers.
			// The reply is an SSE stream, so the single `data:` frame is decoded
			// back into the JSON-RPC envelope the assertions are written against.
			const legacyRpc = async (method: string, params?: Record<string, unknown>, accept: string = MCP_ACCEPT) => {
				const res = await api
					.post(
						'/admin/mcp',
						{ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) },
						{ headers: { Authorization: `Bearer ${admin.token}`, Accept: accept, 'Content-Type': 'application/json' } }
					)
					.catch((e: any) => e.response)

				const frame =
					typeof res.data === 'string'
						? String(res.data)
								.split('\n')
								.find((l: string) => l.startsWith('data: '))
						: undefined
				return { res, body: frame ? JSON.parse(frame.slice(6)) : res.data }
			}

			// A modern (2026-07-28) call. `Mcp-Method` is mandatory, and `Mcp-Name`
			// is mandatory whenever the body carries a `params.name` -- the server
			// rejects a header/body disagreement with -32020 rather than trusting
			// either side, which is what makes header-based routing safe.
			const modernRpc = async (method: string, params: Record<string, unknown> = {}) =>
				api
					.post(
						'/admin/mcp',
						{
							jsonrpc: '2.0',
							id: 1,
							method,
							params: {
								...params,
								_meta: {
									'io.modelcontextprotocol/protocolVersion': '2026-07-28',
									'io.modelcontextprotocol/clientCapabilities': {},
									'io.modelcontextprotocol/clientInfo': { name: 'integration-test', version: '0.0.0' }
								}
							}
						},
						{
							headers: {
								Authorization: `Bearer ${admin.token}`,
								Accept: MCP_ACCEPT,
								'Content-Type': 'application/json',
								'Mcp-Method': method,
								...(params.name ? { 'Mcp-Name': String(params.name) } : {})
							}
						}
					)
					.catch((e: any) => e.response)

			// ── Endpoint-level contracts (era-independent) ─────────────────────

			it('requires admin auth', async () => {
				const res = await api
					.post('/admin/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/list' }, { headers: { Accept: MCP_ACCEPT } })
					.catch((e: any) => e.response)
				expect(res.status).toBe(401)
			})

			it('405s the GET and DELETE methods', async () => {
				// Both are intentional dead ends. Under 2025-11-25 these were the SSE
				// stream and session-termination endpoints, neither of which a
				// stateless tools-only server needs; 2026-07-28 replaced the GET
				// stream with `subscriptions/listen` (a POST) and removed session
				// DELETE outright, so they stay 405 in both eras.
				const get = await api.get('/admin/mcp', { headers: { Authorization: `Bearer ${admin.token}` } }).catch((e: any) => e.response)
				expect(get.status).toBe(405)

				const del = await api.delete('/admin/mcp', { headers: { Authorization: `Bearer ${admin.token}` } }).catch((e: any) => e.response)
				expect(del.status).toBe(405)
			})

			it('rejects a POST whose Accept header omits text/event-stream', async () => {
				// A real interop sharp edge, unchanged by v2: the SDK demands both
				// media types even for an exchange it will answer with plain JSON,
				// so a client that sensibly sends only `application/json` gets 406.
				const { res } = await legacyRpc('tools/list', undefined, 'application/json')
				expect(res.status).toBe(406)
			})

			it('never mints a session id', async () => {
				// The load-bearing statelessness assertion. 2026-07-28 removed
				// protocol sessions entirely; a response that started carrying
				// `mcp-session-id` would mean something had reintroduced sessionful
				// serving, silently breaking horizontal scaling.
				const modern = await modernRpc('tools/list')
				expect(modern.headers['mcp-session-id']).toBeUndefined()

				const { res } = await legacyRpc('tools/list')
				expect(res.headers['mcp-session-id']).toBeUndefined()
			})

			// ── Legacy (2025-11-25) clients ────────────────────────────────────

			describe('legacy (2025-11-25) clients', () => {
				it('answers initialize with its identity and the tools capability', async () => {
					const { res, body } = await legacyRpc('initialize', {
						protocolVersion: '2025-11-25',
						capabilities: {},
						clientInfo: { name: 'integration-test', version: '0.0.0' }
					})
					expect(res.status).toBe(200)
					expect(body.jsonrpc).toBe('2.0')
					// Response contract: initialize -> InitializeResult (legacy only)
					expect(() => LegacyInitializeResultSchema.parse(body.result)).not.toThrow()
					expect(body.result.serverInfo).toMatchObject({ name: 'medusa-admin', version: '1.0.0' })
					// Tools only. No resources, prompts, or logging -- the latter two
					// of which 2026-07-28 deprecates outright.
					expect(body.result.capabilities).toHaveProperty('tools')
					expect(body.result.capabilities).not.toHaveProperty('resources')
					expect(body.result.capabilities).not.toHaveProperty('prompts')
					expect(body.result.capabilities).not.toHaveProperty('logging')
				})

				it('replies over SSE', async () => {
					// Documents what legacy clients actually receive. v1 could be put
					// into a plain-JSON mode for every caller (`enableJsonResponse`);
					// v2 scopes response shaping to modern exchanges only, so 2025-era
					// traffic is SSE-framed again. Harmless -- SSE was the v1 default
					// and every current client handles it -- but not what a reader
					// would assume after seeing the modern path reply with JSON.
					const { res } = await legacyRpc('tools/list')
					expect(res.status).toBe(200)
					expect(res.headers['content-type']).toMatch(/text\/event-stream/)
				})

				it('serves tools/list with no prior initialize, in registration order', async () => {
					// Statelessness as behaviour rather than configuration: this POST
					// shares nothing with the initialize call above and still gets a
					// full tool list.
					const { res, body } = await legacyRpc('tools/list')
					expect(res.status).toBe(200)
					// Response contract: tools/list -> ListToolsResult (legacy shape)
					expect(() => LegacyToolsListResultSchema.parse(body.result)).not.toThrow()
					expect(body.result.tools.map((t: any) => t.name)).toEqual(BUILT_IN_TOOLS)
				})

				it('executes a tool call and returns a text content block', async () => {
					const { res, body } = await legacyRpc('tools/call', {
						name: 'search_products',
						arguments: { q: 'nonexistent-product-xyz', limit: 5 }
					})
					expect(res.status).toBe(200)
					// Response contract: tools/call -> CallToolResult (legacy shape)
					expect(() => LegacyCallToolResultSchema.parse(body.result)).not.toThrow()
					expect(JSON.parse(body.result.content[0].text)).toEqual([])
				})
			})

			// ── Modern (2026-07-28) protocol ───────────────────────────────────

			describe('modern (2026-07-28) protocol', () => {
				it('implements server/discover', async () => {
					// New in 2026-07-28 and a MUST for every server: it replaces
					// `initialize` as the way a client learns supported versions,
					// capabilities and identity before sending anything else.
					const res = await modernRpc('server/discover')
					expect(res.status).toBe(200)
					// Response contract: server/discover -> DiscoverResult
					expect(() => ModernDiscoverResultSchema.parse(res.data.result)).not.toThrow()
					expect(res.data.result.supportedVersions).toContain('2026-07-28')
					expect(res.data.result.capabilities).toHaveProperty('tools')
					expect(res.data.result._meta['io.modelcontextprotocol/serverInfo']).toMatchObject({
						name: 'medusa-admin',
						version: '1.0.0'
					})
				})

				it('replies with a single JSON body, not an SSE stream', async () => {
					// `responseMode: 'auto'` in the route. Nothing here emits a
					// mid-call notification, so the exchange collapses to one JSON
					// body; were a handler to start reporting progress, the same
					// setting would upgrade the response to SSE rather than drop it.
					const res = await modernRpc('tools/list')
					expect(res.status).toBe(200)
					expect(res.headers['content-type']).toMatch(/application\/json/)
					expect(typeof res.data).toBe('object')
				})

				it('serves tools/list with no handshake, in registration order', async () => {
					const res = await modernRpc('tools/list')
					expect(res.status).toBe(200)
					// Response contract: tools/list -> ListToolsResult (modern shape)
					expect(() => ModernToolsListResultSchema.parse(res.data.result)).not.toThrow()
					expect(res.data.result.tools.map((t: any) => t.name)).toEqual(BUILT_IN_TOOLS)
					expect(res.data.result.resultType).toBe('complete')
				})

				it('marks the tool list as privately cacheable', async () => {
					// Not incidental. This server's tool list VARIES PER CALLER --
					// write tools are filtered out entirely by `allowWriteTools` and
					// the `mcp:write` policy -- so a shared intermediary must never
					// serve one admin's list to another. `cacheScope: 'private'` is
					// the SDK default rather than something the route configures,
					// which is exactly why it is asserted: a future default flip to
					// 'public' would silently widen cache scope on a per-caller list.
					const res = await modernRpc('tools/list')
					expect(res.data.result.cacheScope).toBe('private')
					expect(typeof res.data.result.ttlMs).toBe('number')
				})

				it('advertises only read-only tools while allowWriteTools is off', async () => {
					// `allowWriteTools` defaults off, so write-flagged tools are
					// filtered out of the list entirely rather than merely failing
					// when called. The built-ins are all read-only today, so this
					// asserts the invariant the gate exists to protect: nothing
					// mutating reaches the wire by default, including anything a
					// `toolPackages` plugin contributes.
					const res = await modernRpc('tools/list')
					const names: string[] = res.data.result.tools.map((t: any) => t.name)
					expect(names).toHaveLength(BUILT_IN_TOOLS.length)
					expect(names.some(n => /^(create|update|delete|cancel|dispatch|trigger|retry)_/.test(n))).toBe(false)

					// Every advertised tool is fully described -- a tool whose schema
					// failed to convert would still be callable but useless to an LLM.
					for (const tool of res.data.result.tools) {
						expect(tool.description.length).toBeGreaterThan(0)
						expect(tool.inputSchema.type).toBe('object')
					}
				})

				it('executes a tool call and returns a text content block', async () => {
					const res = await modernRpc('tools/call', {
						name: 'search_products',
						arguments: { q: 'nonexistent-product-xyz', limit: 5 }
					})
					expect(res.status).toBe(200)
					// Response contract: tools/call -> CallToolResult (modern shape)
					expect(() => ModernCallToolResultSchema.parse(res.data.result)).not.toThrow()
					expect(res.data.result.content[0].type).toBe('text')
					expect(JSON.parse(res.data.result.content[0].text)).toEqual([])
				})

				it('rejects an unregistered tool as a JSON-RPC error, not an isError result', async () => {
					// A real behaviour change from v1, worth pinning. v1 caught every
					// throw inside the tools/call handler -- including its own "Tool X
					// not found" -- and folded it into a CallToolResult with
					// `isError: true`, so "no such tool" was indistinguishable from
					// "the tool failed" without reading prose. Modern v2 returns
					// -32602 instead, making it a protocol-level distinction.
					const res = await modernRpc('tools/call', { name: 'definitely_not_a_tool', arguments: {} })
					expect(res.status).toBe(200)
					// Response contract: JSON-RPC 2.0 error envelope
					expect(() => JsonRpcErrorResponseSchema.parse(res.data)).not.toThrow()
					expect(res.data.error.code).toBe(-32602)
					expect(res.data.error.message).toMatch(/definitely_not_a_tool/)
				})

				it('rejects a tool call whose arguments fail the tool schema', async () => {
					// `search_products.q` is required. Schema enforcement happens
					// inside the SDK, so this asserts tool input validation is wired
					// up rather than silently permissive.
					const res = await modernRpc('tools/call', { name: 'search_products', arguments: { limit: 5 } })
					expect(res.status).toBe(200)
					const failed = res.data.error !== undefined || res.data.result?.isError === true
					expect(failed).toBe(true)
				})

				it('rejects an unsupported method with a JSON-RPC error', async () => {
					// The server advertises only the tools capability, so
					// `resources/list` has no registered handler and fails at the
					// protocol layer (-32601 Method not found).
					//
					// Note the HTTP status: 404, not 200. v2 maps protocol errors onto
					// meaningful HTTP codes instead of tunnelling every one through a
					// 200 the way v1 did, so an unknown method is legible to proxies
					// and logs without parsing the JSON-RPC body.
					const res = await modernRpc('resources/list')
					expect(res.status).toBe(404)
					// Response contract: JSON-RPC 2.0 error envelope
					expect(() => JsonRpcErrorResponseSchema.parse(res.data)).not.toThrow()
					expect(res.data.error.code).toBe(-32601)
				})

				it('requires the Mcp-Method routing header to match the body', async () => {
					// 2026-07-28 requires `Mcp-Method` (and `Mcp-Name` where the body
					// carries one) on every POST so load balancers and gateways can
					// route without parsing JSON-RPC. The server refuses to guess when
					// the two disagree, answering -32020 HeaderMismatch rather than
					// trusting either side -- which is what makes edge routing on
					// those headers safe to build on.
					const res = await api
						.post(
							'/admin/mcp',
							{
								jsonrpc: '2.0',
								id: 1,
								method: 'tools/list',
								params: {
									_meta: {
										'io.modelcontextprotocol/protocolVersion': '2026-07-28',
										'io.modelcontextprotocol/clientCapabilities': {}
									}
								}
							},
							{ headers: { Authorization: `Bearer ${admin.token}`, Accept: MCP_ACCEPT, 'Content-Type': 'application/json' } }
						)
						.catch((e: any) => e.response)

					expect(res.status).toBe(400)
					expect(() => JsonRpcErrorResponseSchema.parse(res.data)).not.toThrow()
					expect(res.data.error.code).toBe(-32020)
				})
			})
		})

		describe('Chat message persistence (service round-trip)', () => {
			it("creates a session, appends messages in order, and advances last_message_at on each persist — mirrors POST /admin/chat's persist() helper without calling the LLM", async () => {
				const container = getContainer()
				const mcp: any = container.resolve(MCP_MODULE)
				const now = Date.now()

				const session = await mcp.createChatSessions({
					user_id: 'persistence-test-user',
					title: 'Persistence round-trip',
					last_message_at: new Date(now - 60_000)
				})
				const initialLastMessageAt = new Date(session.last_message_at).getTime()

				// Mirrors route.ts `persist()`: create the message FK'd to the session
				// via `session_id`, then touch the session's `last_message_at`.
				await mcp.createChatMessages({
					session_id: session.id,
					role: 'user',
					content: [{ type: 'text', text: "What were yesterday's sales?" }]
				})
				await mcp.updateChatSessions({ id: session.id, last_message_at: new Date() })

				await mcp.createChatMessages({
					session_id: session.id,
					role: 'assistant',
					content: [{ type: 'text', text: 'Yesterday you had 12 orders totaling $340.' }]
				})
				await mcp.updateChatSessions({ id: session.id, last_message_at: new Date() })

				const [reloaded] = await mcp.listChatSessions({ id: session.id }, { relations: ['messages'] })
				expect(reloaded).toBeDefined()

				const orderedMessages = [...reloaded.messages].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
				expect(orderedMessages.map((m: any) => ({ role: m.role, content: m.content }))).toEqual([
					{
						role: 'user',
						content: [{ type: 'text', text: "What were yesterday's sales?" }]
					},
					{
						role: 'assistant',
						content: [{ type: 'text', text: 'Yesterday you had 12 orders totaling $340.' }]
					}
				])

				expect(new Date(reloaded.last_message_at).getTime()).toBeGreaterThan(initialLastMessageAt)
			})
		})

		describe('Retention purge', () => {
			it('removes sessions past the cutoff and cascades to messages, keeps fresh ones', async () => {
				const container = getContainer()
				const mcp: any = container.resolve(MCP_MODULE)
				const now = Date.now()
				const DAY = 24 * 60 * 60 * 1000

				const stale = await mcp.createChatSessions({
					user_id: 'purge-test-user',
					title: 'Stale chat',
					last_message_at: new Date(now - 40 * DAY)
				})
				const fresh = await mcp.createChatSessions({
					user_id: 'purge-test-user',
					title: 'Fresh chat',
					last_message_at: new Date(now - 1 * DAY)
				})
				await mcp.createChatMessages({
					session_id: stale.id,
					role: 'user',
					content: [{ type: 'text', text: 'old message' }]
				})

				const cutoff = new Date(now - 30 * DAY)
				const purgedCount = await mcp.purgeSessionsOlderThan(cutoff)
				expect(purgedCount).toBe(1)

				const staleAfter = await mcp.listChatSessions({ id: stale.id })
				expect(staleAfter).toHaveLength(0)
				const freshAfter = await mcp.listChatSessions({ id: fresh.id })
				expect(freshAfter).toHaveLength(1)

				const staleMessagesAfter = await mcp.listChatMessages({ session_id: stale.id })
				expect(staleMessagesAfter).toHaveLength(0)
			})
		})
	}
})
