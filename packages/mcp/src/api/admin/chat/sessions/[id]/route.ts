import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MCP_MODULE } from '../../../../../modules/mcp'
import type { McpService } from '../../../../../modules/mcp/service'

const loadOwned = async (req: AuthenticatedMedusaRequest, relations: string[] = []) => {
	const svc = req.scope.resolve(MCP_MODULE) as McpService
	const [session] = await svc.listChatSessions(
		{ id: req.params.id, user_id: req.auth_context.actor_id },
		{ take: 1, ...(relations.length ? { relations } : {}) }
	)
	return { svc, session }
}

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	if (!req.auth_context?.actor_id) return res.status(401).json({ error: 'Unauthorized' })
	const { session } = await loadOwned(req, ['messages'])
	if (!session) return res.status(404).json({ error: 'Session not found' })
	const messages = [...(session.messages ?? [])]
		.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
		.map((m: any) => ({ role: m.role, content: m.content }))
	res.json({ session: { id: session.id, title: session.title }, messages })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	if (!req.auth_context?.actor_id) return res.status(401).json({ error: 'Unauthorized' })
	const { svc, session } = await loadOwned(req)
	if (!session) return res.status(404).json({ error: 'Session not found' })
	await svc.deleteChatSessions([session.id]) // cascade removes messages
	res.status(200).json({ id: session.id, deleted: true })
}
