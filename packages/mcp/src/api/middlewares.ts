import { defineMiddlewares, validateAndTransformBody } from '@medusajs/framework/http'
import { AdminPostChat } from './validators'

// Declare the `mcp:write` policy with medusa-plugin-access when it is installed, so it can be
// assigned to roles and gate the MCP write tools. Soft dependency — no-op if access is absent.
try {
	const access = require('medusa-plugin-access')
	access.definePolicies?.([
		{
			name: 'McpWrite',
			resource: 'mcp',
			operation: 'write',
			description: 'Invoke MCP write tools (e.g. trigger automations) via chat or the MCP server'
		}
	])
} catch {
	// medusa-plugin-access not installed — write-tool gating falls back to the allowWriteTools flag.
}

export default defineMiddlewares([
	{
		matcher: '/admin/chat',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminPostChat)]
	}
])
