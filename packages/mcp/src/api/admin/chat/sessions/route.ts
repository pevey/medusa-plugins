import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MCP_MODULE } from '../../../../modules/mcp'
import type { McpService } from '../../../../modules/mcp/service'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const svc = req.scope.resolve(MCP_MODULE) as McpService
	const userId = req.auth_context?.actor_id
	if (!userId) return res.status(401).json({ error: 'Unauthorized' })
	const sessions = await svc.listChatSessions(
		{ user_id: userId },
		{ select: ['id', 'title', 'last_message_at'], order: { last_message_at: 'DESC' } }
	)
	res.json({ sessions })
}
