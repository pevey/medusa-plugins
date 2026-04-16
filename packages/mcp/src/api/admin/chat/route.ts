import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { AdminPostChatType } from '../../validators'
import { createMcpServer } from '../../../mcp/server'
import { createProvider, type ChatMessage, type ToolDefinition } from '../../../lib/llm-provider'
import { MCP_MODULE } from '../../../modules/mcp'
import { McpService } from '../../../modules/mcp/service'

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant for a Medusa commerce store admin. You have access to tools that let you query store data (orders, customers, products, inventory) and manage automations. Use the tools to answer questions with real data. Be concise and helpful. When displaying data, format it clearly.`

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminPostChatType>,
	res: MedusaResponse
) => {
	try {
		const mcpService = req.scope.resolve(MCP_MODULE) as McpService
		const options = mcpService.getOptions()

		if (!options?.provider) {
			return res.status(500).json({
				error: 'MCP plugin options not configured. Set provider, model, and apiKey in medusa-config.ts.'
			})
		}

		if (options.provider !== 'ollama' && !options.apiKey) {
			return res.status(500).json({
				error: `API key required for ${options.provider} provider. Set MCP_LLM_API_KEY in your environment.`
			})
		}

		const provider = createProvider(options)
		const mcpServer = await createMcpServer(req.scope)

		// Extract tool definitions from MCP server internals
		const registeredTools = (mcpServer as any)._registeredTools as Record<string, any>
		const toolDefs: ToolDefinition[] = []
		const toolHandlers = new Map<string, (args: Record<string, unknown>) => Promise<any>>()

		for (const [name, tool] of Object.entries(registeredTools)) {
			const jsonSchema = tool.inputSchema
				? zodToJsonSchema(tool.inputSchema)
				: { type: 'object', properties: {} }
			toolDefs.push({
				name,
				description: tool.description ?? '',
				inputSchema: jsonSchema as Record<string, unknown>
			})
			toolHandlers.set(name, tool.handler)
		}

		const systemPrompt = options.systemPrompt
			? `${DEFAULT_SYSTEM_PROMPT}\n\n${options.systemPrompt}`
			: DEFAULT_SYSTEM_PROMPT

		// Build conversation with tool-use loop
		let messages: ChatMessage[] = [...req.body.messages]
		const allToolCalls: Array<{ name: string; args: Record<string, unknown>; result: string }> = []
		const MAX_TOOL_ROUNDS = 10

		for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
			const response = await provider.chat({
				messages,
				tools: toolDefs,
				systemPrompt
			})

			if (response.toolCalls.length === 0) {
				return res.json({
					role: 'assistant',
					content: response.content,
					tool_calls: allToolCalls.length > 0 ? allToolCalls : undefined
				})
			}

			// Execute each tool call via the handler directly
			const toolResults: string[] = []
			for (const tc of response.toolCalls) {
				let result: string
				try {
					const handler = toolHandlers.get(tc.name)
					if (!handler) throw new Error(`Unknown tool: ${tc.name}`)
					const mcpResult = await handler(tc.args)
					result = mcpResult?.content?.map((c: any) => c.text ?? JSON.stringify(c)).join('\n') ?? 'No result'
				} catch (err) {
					result = `Error: ${err instanceof Error ? err.message : String(err)}`
				}
				toolResults.push(result)
				allToolCalls.push({ name: tc.name, args: tc.args, result })
			}

			const toolSummary = response.toolCalls.map((tc, i) =>
				`[Tool: ${tc.name}]\nArgs: ${JSON.stringify(tc.args)}\nResult: ${toolResults[i]}`
			).join('\n\n')

			if (response.content) {
				messages.push({ role: 'assistant', content: response.content })
			}
			messages.push({
				role: 'user',
				content: `[Tool results]\n${toolSummary}`
			})
		}

		return res.json({
			role: 'assistant',
			content: 'I reached the maximum number of tool calls. Here is what I found so far.',
			tool_calls: allToolCalls.length > 0 ? allToolCalls : undefined
		})
	} catch (err) {
		console.error('[Chat] Error:', err)
		if (!res.headersSent) {
			res.status(500).json({
				error: err instanceof Error ? err.message : 'Internal server error'
			})
		}
	}
}
