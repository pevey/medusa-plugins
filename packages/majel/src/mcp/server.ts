import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MedusaContainer } from '@medusajs/framework/types'
import { registerQueryTool } from './tools/query'
import { registerOrderTools } from './tools/orders'
import { registerCustomerTools } from './tools/customers'
import { registerProductTools } from './tools/products'
import { registerInventoryTools } from './tools/inventory'

export const createMcpServer = (scope: MedusaContainer): McpServer => {
	const server = new McpServer({
		name: 'medusa-admin',
		version: '1.0.0'
	})

	registerQueryTool(server, scope)
	registerOrderTools(server, scope)
	registerCustomerTools(server, scope)
	registerProductTools(server, scope)
	registerInventoryTools(server, scope)

	return server
}
