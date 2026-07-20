import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { z } from '@medusajs/framework/zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { AdminPostChatType } from '../../validators'
import { resolveMcpTools } from '../../../mcp/tools'
import { createProvider, type ChatMessage, type ContentBlock, type ToolDefinition } from '../../../lib/llm-provider'
import { windowHistory, dropUnpairedToolUse } from '../../../lib/history-window'
import { MCP_MODULE } from '../../../modules/mcp'
import { McpService } from '../../../modules/mcp/service'

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant for a Medusa commerce store admin. You have access to tools that let you query store data (orders, customers, products, inventory) and manage automations. Use the tools to answer questions with real data. Be concise and helpful. When displaying data, format it clearly.`
const MAX_TOOL_ROUNDS = 10

const deriveTitle = (text: string) => text.trim().replace(/\s+/g, ' ').slice(0, 40) || 'New chat'

export const POST = async (req: AuthenticatedMedusaRequest<AdminPostChatType>, res: MedusaResponse) => {
	const svc = req.scope.resolve(MCP_MODULE) as McpService
	const options = svc.getOptions()
	const userId = req.auth_context?.actor_id

	if (!userId) return res.status(401).json({ error: 'Unauthorized' })

	const send = (event: string, data: unknown) => {
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
	}
	const setSseHeaders = () => {
		res.setHeader('Content-Type', 'text/event-stream')
		res.setHeader('Cache-Control', 'no-cache, no-transform')
		res.setHeader('Connection', 'keep-alive')
		res.flushHeaders?.()
	}

	if (!options?.provider) {
		setSseHeaders()
		send('error', { message: 'MCP plugin options not configured. Set provider, model, and apiKey in medusa-config.ts.' })
		return res.end()
	}
	if (!options.model || !options.apiKey) {
		setSseHeaders()
		send('error', { message: `Model and API key required for ${options.provider} provider. Set the model and apiKey provider options in medusa-config.ts.` })
		return res.end()
	}

	// Provider + tools (Phase A setup; setup errors → JSON 500 before headers).
	// Runs before session load-or-create so a setup failure never leaves an
	// orphan empty session at the top of the sidebar.
	let provider: ReturnType<typeof createProvider>
	const toolDefs: ToolDefinition[] = []
	const toolHandlers = new Map<string, (args: Record<string, unknown>) => Promise<any>>()
	let systemPrompt: string
	try {
		provider = createProvider(options)
		const actor = { id: req.auth_context?.actor_id, type: req.auth_context?.actor_type }
		const tools = await resolveMcpTools(req.scope, options, actor)
		for (const tool of tools) {
			toolDefs.push({ name: tool.name, description: tool.description, inputSchema: zodToJsonSchema(z.object(tool.inputSchema) as any) as Record<string, unknown> })
			toolHandlers.set(tool.name, tool.handler)
		}
		systemPrompt = options.systemPrompt ? `${DEFAULT_SYSTEM_PROMPT}\n\n${options.systemPrompt}` : DEFAULT_SYSTEM_PROMPT
	} catch (err) {
		if (!res.headersSent) return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to initialize chat' })
		throw err
	}

	// Load or create the session (before streaming, so 404s are clean JSON).
	let sessionId = req.body.session_id
	let title: string
	let history: ChatMessage[] = []
	try {
		if (sessionId) {
			const [session] = await svc.listChatSessions({ id: sessionId, user_id: userId }, { take: 1, relations: ['messages'] })
			if (!session) return res.status(404).json({ error: 'Session not found' })
			title = session.title
			history = [...(session.messages ?? [])]
				.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
				.map((m: any) => ({ role: m.role, content: m.content as ContentBlock[] }))
		} else {
			title = deriveTitle(req.body.text)
			const session = await svc.createChatSessions({ user_id: userId, title, last_message_at: new Date() })
			sessionId = session.id
		}
	} catch (err) {
		return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load session' })
	}

	setSseHeaders()
	send('session', { id: sessionId, title })

	const ac = new AbortController()
	req.on('close', () => ac.abort())

	// Persist the user message immediately + touch the session.
	const userMessage: ChatMessage = { role: 'user', content: [{ type: 'text', text: req.body.text }] }
	const persist = async (m: ChatMessage) => {
		await svc.createChatMessages({ session_id: sessionId, role: m.role, content: m.content as unknown as Record<string, unknown> })
		await svc.updateChatSessions({ id: sessionId, last_message_at: new Date() })
	}
	try {
		await persist(userMessage)
	} catch (err) {
		if (!ac.signal.aborted) send('error', { message: err instanceof Error ? err.message : 'Failed to save message' })
		return res.end()
	}

	// LLM input = windowed(sanitized history + new user message). Sanitize first to drop any
	// dangling tool_use left by a fault mid-round, then window so the start boundary is clean.
	const messages: ChatMessage[] = windowHistory([...dropUnpairedToolUse(history), userMessage], options.maxHistoryTurns ?? 10)

	try {
		for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
			const assistantBlocks: ContentBlock[] = []
			const toolUses: { id: string; name: string; input: Record<string, unknown> }[] = []
			let text = ''

			for await (const ev of provider.chatStream({ messages, tools: toolDefs, systemPrompt, signal: ac.signal })) {
				if (ev.type === 'text') { text += ev.delta; send('text', { delta: ev.delta }) }
				else if (ev.type === 'tool_use') { toolUses.push(ev); send('tool_call', { id: ev.id, name: ev.name, args: ev.input }) }
				else if (ev.type === 'done' && ev.stopReason === 'end' && toolUses.length === 0) {
					if (text) { const m: ChatMessage = { role: 'assistant', content: [{ type: 'text', text }] }; await persist(m) }
					send('done', {})
					return res.end()
				}
			}

			if (text) assistantBlocks.push({ type: 'text', text })
			for (const tu of toolUses) assistantBlocks.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input })

			// Turn ended without tools (or the provider reported tool_use but emitted none): finalize.
			// Persist any assistant text so a reply shown live isn't lost on reload.
			if (toolUses.length === 0) {
				if (assistantBlocks.length) await persist({ role: 'assistant', content: assistantBlocks })
				send('done', {})
				return res.end()
			}

			const assistantMsg: ChatMessage = { role: 'assistant', content: assistantBlocks }
			messages.push(assistantMsg)
			await persist(assistantMsg)

			const resultBlocks: ContentBlock[] = []
			for (const tu of toolUses) {
				let result: string; let is_error = false
				try {
					const handler = toolHandlers.get(tu.name)
					const out = await handler?.(tu.input)
					result = out?.content?.map((c: any) => c.text ?? JSON.stringify(c)).join('\n') ?? (toolHandlers.has(tu.name) ? 'No result' : `Unknown tool: ${tu.name}`)
				} catch (e) { is_error = true; result = `Error: ${e instanceof Error ? e.message : String(e)}` }
				send('tool_result', { id: tu.id, result, is_error })
				resultBlocks.push({ type: 'tool_result', tool_use_id: tu.id, content: result, is_error })
			}
			const toolResultMsg: ChatMessage = { role: 'user', content: resultBlocks }
			messages.push(toolResultMsg)
			await persist(toolResultMsg)
		}

		const maxRoundsNote = '\n\n_(reached the maximum number of tool rounds)_'
		send('text', { delta: maxRoundsNote })
		await persist({ role: 'assistant', content: [{ type: 'text', text: maxRoundsNote }] })
		send('done', {})
		res.end()
	} catch (err) {
		if (!ac.signal.aborted) send('error', { message: err instanceof Error ? err.message : 'Chat error' })
		res.end()
	}
}
