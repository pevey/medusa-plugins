import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MedusaContainer } from '@medusajs/framework/types'
import { registerQueryTool } from './tools/query'
import { registerOrderTools } from './tools/orders'
import { registerCustomerTools } from './tools/customers'
import { registerProductTools } from './tools/products'
import { registerInventoryTools } from './tools/inventory'
import { registerStatisticsTools } from './tools/statistics'
import { registerAutomationTools } from './tools/automations'

export const createMcpServer = async (scope: MedusaContainer): Promise<McpServer> => {
	const server = new McpServer({
		name: 'medusa-admin',
		version: '1.0.0'
	})

	// Core tools — always available (only need Medusa container query API)
	registerQueryTool(server, scope)
	registerOrderTools(server, scope)
	registerCustomerTools(server, scope)
	registerProductTools(server, scope)
	registerInventoryTools(server, scope)

	// Statistics tools — registered if medusa-plugin-statistics is installed
	try {
		const { STATISTICS_MODULE } = await import('medusa-plugin-statistics')
		registerStatisticsTools(server, scope, STATISTICS_MODULE)
	} catch {
		// package not installed — skip
	}

	// Automation tools — registered if medusa-plugin-automation is installed
	try {
		const { AUTOMATION_MODULE } = await import('medusa-plugin-automation')
		registerAutomationTools(server, scope, AUTOMATION_MODULE)
	} catch {
		// package not installed — skip
	}

	return server
}
