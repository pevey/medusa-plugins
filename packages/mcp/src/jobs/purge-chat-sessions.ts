import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MCP_MODULE } from '../modules/mcp'
import type { McpService } from '../modules/mcp/service'

export default async function purgeChatSessionsJob(container: MedusaContainer) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const svc = container.resolve(MCP_MODULE) as McpService
	const days = svc.getOptions().chatRetentionDays ?? 30

	if (!days || days <= 0) {
		logger.info('mcp-chat-purge: retention disabled (chatRetentionDays <= 0), skipping')
		return
	}
	try {
		const cutoff = new Date()
		cutoff.setDate(cutoff.getDate() - days)
		const deleted = await svc.purgeSessionsOlderThan(cutoff)
		logger.info(`mcp-chat-purge: deleted ${deleted} chat session(s) idle since before ${cutoff.toISOString().slice(0, 10)} (${days}d retention)`)
	} catch (error: any) {
		logger.error(`mcp-chat-purge: failed: ${error.message}`)
	}
}

export const config = {
	name: 'mcp-chat-purge',
	schedule: '0 3 * * *',
}
