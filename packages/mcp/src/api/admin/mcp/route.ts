import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { toNodeHandler } from '@modelcontextprotocol/node'
import { createMcpServer } from '../../../mcp/server'
import { MCP_MODULE, McpService } from '../../../modules/mcp'

/**
 * The MCP endpoint, on SDK v2 / the 2026-07-28 protocol revision.
 *
 * `createMcpHandler` takes a *factory* rather than a server instance and runs it once per
 * request, holding nothing in between. That is the same statelessness this route already had
 * (fresh server + `sessionIdGenerator: undefined`), except it is now the SDK's built-in model
 * instead of something assembled here: 2026-07-28 removed protocol sessions and the
 * initialize handshake outright, so per-request serving is the only mode there is.
 *
 * Both option defaults below are stated explicitly rather than relied upon, because both
 * encode a decision this plugin actually cares about:
 *
 * - `legacy: 'stateless'` keeps serving 2025-era clients (everything shipping today) from the
 *   very same factory, over a per-request transport. Without it — `legacy: 'reject'` — every
 *   current MCP client would get an unsupported-protocol-version error the moment this
 *   deployed. The SDK answers legacy GET/DELETE (the 2025 SSE stream and session-termination
 *   endpoints) with 405 on its own, matching what the explicit handlers below have always done.
 *
 * - `responseMode: 'auto'` returns a single JSON body when the exchange produces only a result,
 *   and upgrades to SSE if a handler emits a related message (progress, logging) before it.
 *   This supersedes v1's `enableJsonResponse: true`, which bought the same plain-JSON reply but
 *   permanently: under `'json'` mid-call notifications are *dropped*, so adding a progress-
 *   reporting tool later would silently lose them. `'auto'` gives the JSON response today —
 *   nothing here emits mid-call messages — without foreclosing that.
 *
 * Auth stays per-request and is Medusa's: this route lives under `/admin`, so core's admin
 * middleware has already run. `authInfo` is strictly pass-through — the handler verifies no
 * tokens itself — and the Medusa actor is what the tool layer gates writes on.
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	try {
		const options = (req.scope.resolve(MCP_MODULE) as McpService).getOptions()
		const actor = { id: req.auth_context?.actor_id, type: req.auth_context?.actor_type }

		const handler = createMcpHandler(() => createMcpServer(req.scope, options, actor), {
			legacy: 'stateless',
			responseMode: 'auto',
			onerror: err => console.error('[MCP]', err)
		})

		// Medusa's body parser has already drained the request stream, so the parsed body is
		// handed over explicitly; the adapter would otherwise try to re-read an empty stream.
		await toNodeHandler(handler, { onerror: err => console.error('[MCP] adapter:', err) })(req, res, req.body)
	} catch (err) {
		console.error('[MCP] Error:', err)
		if (!res.headersSent) {
			res.status(500).json({
				jsonrpc: '2.0',
				error: { code: -32603, message: 'Internal server error' },
				id: null
			})
		}
	}
}

// Kept explicit rather than deleted: without these exports Medusa would answer 404, which
// reads as "no MCP endpoint here" instead of "this endpoint does not do that". 2026-07-28
// removed session DELETE entirely and replaced the GET stream with `subscriptions/listen`
// (a POST), and this server opts out of subscriptions, so both stay dead ends on purpose.
export const GET = async (_req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	res.writeHead(405).end(JSON.stringify({ error: 'Method not allowed' }))
}

export const DELETE = async (_req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	res.writeHead(405).end(JSON.stringify({ error: 'Method not allowed' }))
}
