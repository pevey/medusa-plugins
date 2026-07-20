import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer } from '../../../mcp/server'
import { MCP_MODULE, McpService } from '../../../modules/mcp'

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	try {
		const options = (req.scope.resolve(MCP_MODULE) as McpService).getOptions()
		const actor = { id: req.auth_context?.actor_id, type: req.auth_context?.actor_type }

		// Stateless: a fresh server + transport per request. This server only serves tools
		// (no server-initiated notifications), so no session state is needed — and this works
		// correctly across multiple server/worker instances, with nothing to leak.
		const server = await createMcpServer(req.scope, options, actor)
		const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

		res.on('close', () => {
			transport.close()
			server.close()
		})

		await server.connect(transport)
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
