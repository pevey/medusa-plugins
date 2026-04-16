import OpenAI from 'openai'
import type { LlmProvider, ChatMessage, ToolDefinition, LlmResponse, ToolCall } from '../llm-provider'

export class OpenAiProvider implements LlmProvider {
	protected client: OpenAI

	constructor(
		protected model: string,
		apiKey: string,
		baseUrl?: string
	) {
		this.client = new OpenAI({
			apiKey,
			...(baseUrl ? { baseURL: baseUrl } : {})
		})
	}

	async chat(params: {
		messages: ChatMessage[]
		tools: ToolDefinition[]
		systemPrompt: string
	}): Promise<LlmResponse> {
		const tools: OpenAI.ChatCompletionTool[] = params.tools.map(t => ({
			type: 'function' as const,
			function: {
				name: t.name,
				description: t.description,
				parameters: t.inputSchema
			}
		}))

		const messages: OpenAI.ChatCompletionMessageParam[] = [
			{ role: 'system', content: params.systemPrompt },
			...params.messages.map(m => ({
				role: m.role as 'user' | 'assistant',
				content: m.content
			}))
		]

		const response = await this.client.chat.completions.create({
			model: this.model,
			messages,
			...(tools.length > 0 ? { tools } : {})
		})

		const choice = response.choices[0]
		const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map(tc => ({
			name: tc.function.name,
			args: JSON.parse(tc.function.arguments)
		}))

		return {
			content: choice.message.content ?? '',
			toolCalls
		}
	}
}
