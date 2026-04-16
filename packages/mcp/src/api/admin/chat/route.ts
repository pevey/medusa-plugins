import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AdminPostChatType } from '../../validators'
import { createMcpServer } from '../../../mcp/server'
import { createProvider, type McpPluginOptions, type ChatMessage, type ToolDefinition } from '../../../lib/llm-provider'

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant for a Medusa commerce store admin. You have access to tools that let you query store data (orders, customers, products, inventory) and manage automations. Use the tools to answer questions with real data. Be concise and helpful. When displaying data, format it clearly.`

// Convert MCP server tool schemas to our ToolDefinition format
function extractToolDefinitions(server: any): ToolDefinition[] {
	const tools: ToolDefinition[] = []
	// Access the registered tools from the MCP server internals
	if (server._registeredTools) {
		for (const [name, tool] of server._registeredTools) {
			tools.push({
				name,
				description: tool.description ?? '',
				inputSchema: tool.inputSchema ?? {}
			})
		}
	}
	return tools
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminPostChatType>,
	res: MedusaResponse
) => {
	try {
		// Resolve plugin options from the MCP module config
		// Options are passed through the plugin registration in medusa-config.ts
		const options = (req as any).scope.resolve('mcp_plugin_options') as McpPluginOptions | undefined

		if (!options?.provider) {
			return res.status(500).json({
				error: 'MCP plugin options not configured. Set provider, model, and apiKey in medusa-config.ts.'
			})
		}

		const provider = createProvider(options)
		const mcpServer = await createMcpServer(req.scope)
		const toolDefs = extractToolDefinitions(mcpServer)

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
				// LLM is done — return the final response
				return res.json({
					role: 'assistant',
					content: response.content,
					tool_calls: allToolCalls.length > 0 ? allToolCalls : undefined
				})
			}

			// Execute each tool call against the MCP server
			const toolResults: string[] = []
			for (const tc of response.toolCalls) {
				let result: string
				try {
					// Call the MCP tool directly via the server
					const mcpResult = await (mcpServer as any).callTool(tc.name, tc.args)
					result = mcpResult?.content?.map((c: any) => c.text ?? JSON.stringify(c)).join('\n') ?? 'No result'
				} catch (err) {
					result = `Error: ${err instanceof Error ? err.message : String(err)}`
				}
				toolResults.push(result)
				allToolCalls.push({ name: tc.name, args: tc.args, result })
			}

			// Add the assistant's response (with tool use) and tool results to conversation
			// Build a summary for the assistant turn and tool results
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

		// If we hit max rounds, return what we have
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
