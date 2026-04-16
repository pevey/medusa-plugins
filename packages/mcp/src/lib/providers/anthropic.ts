import Anthropic from '@anthropic-ai/sdk'
import type { LlmProvider, ChatMessage, ToolDefinition, LlmResponse, ToolCall } from '../llm-provider'

export class AnthropicProvider implements LlmProvider {
	private client: Anthropic

	constructor(
		private model: string,
		apiKey: string,
		baseUrl?: string
	) {
		this.client = new Anthropic({
			apiKey,
			...(baseUrl ? { baseURL: baseUrl } : {})
		})
	}

	async chat(params: {
		messages: ChatMessage[]
		tools: ToolDefinition[]
		systemPrompt: string
	}): Promise<LlmResponse> {
		const tools: Anthropic.Tool[] = params.tools.map(t => ({
			name: t.name,
			description: t.description,
			input_schema: t.inputSchema as Anthropic.Tool.InputSchema
		}))

		const messages: Anthropic.MessageParam[] = params.messages.map(m => ({
			role: m.role,
			content: m.content
		}))

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 4096,
			system: params.systemPrompt,
			messages,
			...(tools.length > 0 ? { tools } : {})
		})

		const textParts: string[] = []
		const toolCalls: ToolCall[] = []

		for (const block of response.content) {
			if (block.type === 'text') {
				textParts.push(block.text)
			} else if (block.type === 'tool_use') {
				toolCalls.push({
					name: block.name,
					args: block.input as Record<string, unknown>
				})
			}
		}

		return {
			content: textParts.join(''),
			toolCalls
		}
	}
}
