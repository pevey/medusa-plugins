/**
 * Integration tests for the mcp plugin's admin chat-session HTTP surface.
 *
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
 * each describe block below does its seeding + assertions inside a single
 * `it` so no state needs to survive a restore boundary.
 *
 * Run with:
 *   yarn workspace medusa-plugin-mcp test:integration:http
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import { MCP_MODULE } from '../../src/modules/mcp'
import { ChatErrorResponseSchema, ChatSessionDeleteResponseSchema, ChatSessionDetailResponseSchema, ChatSessionsListResponseSchema } from './response-contracts'

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
