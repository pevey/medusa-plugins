import { McpServer } from '@modelcontextprotocol/server'
import { MedusaContainer } from '@medusajs/framework/types'
import { resolveMcpTools, type McpActor } from './tools'
import type { McpPluginOptions } from '../types'

export const createMcpServer = async (scope: MedusaContainer, options: McpPluginOptions, actor?: McpActor): Promise<McpServer> => {
	const server = new McpServer({
		name: 'medusa-admin',
		version: '1.0.0'
	})

	const tools = await resolveMcpTools(scope, options, actor)
	for (const tool of tools) {
		server.registerTool(tool.name, { description: tool.description, inputSchema: tool.inputSchema }, tool.handler)
	}

	return server
}
