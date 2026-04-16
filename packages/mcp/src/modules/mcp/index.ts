import { Module } from '@medusajs/framework/utils'
import { McpService } from './service'

export const MCP_MODULE = 'mcp'

export default Module(MCP_MODULE, {
	service: McpService
})

export * from './service'
