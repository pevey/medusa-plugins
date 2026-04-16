import { Ollama } from 'ollama'
import type { LlmProvider, ChatMessage, ToolDefinition, LlmResponse, ToolCall } from '../llm-provider'

export class OllamaProvider implements LlmProvider {
	private client: Ollama

	constructor(
		private model: string,
		baseUrl?: string
	) {
		this.client = new Ollama(baseUrl ? { host: baseUrl } : undefined)
	}

	async chat(params: {
		messages: ChatMessage[]
		tools: ToolDefinition[]
		systemPrompt: string
	}): Promise<LlmResponse> {
		const messages: Array<{ role: string; content: string }> = [
			{ role: 'system', content: params.systemPrompt },
			...params.messages
		]

		const tools = params.tools.map(t => ({
			type: 'function' as const,
			function: {
				name: t.name,
				description: t.description,
				parameters: t.inputSchema
			}
		}))

		const response = await this.client.chat({
			model: this.model,
			messages,
			...(tools.length > 0 ? { tools } : {})
		})

		const toolCalls: ToolCall[] = (response.message.tool_calls ?? []).map(tc => ({
			name: tc.function.name,
			args: tc.function.arguments as Record<string, unknown>
		}))

		return {
			content: response.message.content ?? '',
			toolCalls
		}
	}
}
