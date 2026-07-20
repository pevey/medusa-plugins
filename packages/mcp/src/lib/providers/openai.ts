import OpenAI from 'openai'
import type { LlmProvider, ChatMessage, ToolDefinition, StreamEvent } from '../llm-provider'

function toOpenAiMessages(m: ChatMessage): OpenAI.ChatCompletionMessageParam[] {
	if (m.role === 'assistant') {
		const textParts: string[] = []
		const toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = []

		for (const block of m.content) {
			if (block.type === 'text') {
				textParts.push(block.text)
			} else if (block.type === 'tool_use') {
				toolCalls.push({
					id: block.id,
					type: 'function',
					function: { name: block.name, arguments: JSON.stringify(block.input) }
				})
			}
		}

		const message: OpenAI.ChatCompletionAssistantMessageParam = { role: 'assistant', content: textParts.join('') }
		if (toolCalls.length > 0) message.tool_calls = toolCalls
		return [message]
	}

	// user role: each tool_result block becomes its own `tool` message;
	// remaining text blocks are combined into a single `user` message.
	const messages: OpenAI.ChatCompletionMessageParam[] = []
	const textParts: string[] = []

	for (const block of m.content) {
		if (block.type === 'tool_result') {
			messages.push({ role: 'tool', tool_call_id: block.tool_use_id, content: block.content })
		} else if (block.type === 'text') {
			textParts.push(block.text)
		}
	}

	if (textParts.length > 0) {
		messages.push({ role: 'user', content: textParts.join('') })
	}

	return messages
}

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

	async *chatStream({
		messages,
		tools,
		systemPrompt,
		signal
	}: {
		messages: ChatMessage[]
		tools: ToolDefinition[]
		systemPrompt: string
		signal?: AbortSignal
	}): AsyncIterable<StreamEvent> {
		const oaTools = tools.map(t => ({
			type: 'function' as const,
			function: { name: t.name, description: t.description, parameters: t.inputSchema }
		}))
		const oaMessages: OpenAI.ChatCompletionMessageParam[] = [
			{ role: 'system', content: systemPrompt },
			...messages.flatMap(toOpenAiMessages)
		]

		const stream = await this.client.chat.completions.create(
			{
				model: this.model,
				messages: oaMessages,
				...(oaTools.length ? { tools: oaTools } : {}),
				stream: true
			},
			{ signal }
		)

		const acc = new Map<number, { id: string; name: string; args: string }>()
		let finish: string | null = null

		for await (const chunk of stream) {
			const choice = chunk.choices[0]
			if (!choice) continue

			if (choice.delta.content) yield { type: 'text', delta: choice.delta.content }

			for (const tc of choice.delta.tool_calls ?? []) {
				const cur = acc.get(tc.index) ?? { id: '', name: '', args: '' }
				if (tc.id) cur.id = tc.id
				if (tc.function?.name) cur.name = tc.function.name
				if (tc.function?.arguments) cur.args += tc.function.arguments
				acc.set(tc.index, cur)
			}

			if (choice.finish_reason) finish = choice.finish_reason
		}

		for (const [, tc] of [...acc.entries()].sort((a, b) => a[0] - b[0])) {
			yield { type: 'tool_use', id: tc.id, name: tc.name, input: tc.args ? JSON.parse(tc.args) : {} }
		}

		yield { type: 'done', stopReason: finish === 'tool_calls' ? 'tool_use' : 'end' }
	}
}
