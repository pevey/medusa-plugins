import { randomUUID } from 'node:crypto'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { createMcpServer } from '../../../mcp/server'

// Store transports by session ID for stateful MCP connections
const sessions: Record<string, StreamableHTTPServerTransport> = {}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	try {
		const sessionId = req.headers['mcp-session-id'] as string | undefined
		let transport: StreamableHTTPServerTransport

		if (sessionId && sessions[sessionId]) {
			// Reuse existing session transport
			transport = sessions[sessionId]
		} else if (!sessionId && isInitializeRequest(req.body)) {
			// New initialization request
			transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: () => randomUUID(),
				enableJsonResponse: true,
				onsessioninitialized: (id) => {
					sessions[id] = transport
				}
			})

			const server = await createMcpServer(req.scope)
			await server.connect(transport)
		} else {
			res.status(400).json({
				jsonrpc: '2.0',
				error: { code: -32000, message: 'Bad Request: No valid session. Send initialize first.' },
				id: null
			})
			return
		}

		await transport.handleRequest(req, res, req.body)
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

export const GET = async (_req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	res.writeHead(405).end(JSON.stringify({ error: 'Method not allowed' }))
}

export const DELETE = async (_req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	res.writeHead(405).end(JSON.stringify({ error: 'Method not allowed' }))
}
