import Anthropic from '@anthropic-ai/sdk'
import type { LlmProvider, ChatMessage, ToolDefinition, StreamEvent } from '../llm-provider'

function toAnthropicMessage(m: ChatMessage): Anthropic.MessageParam {
	return {
		role: m.role,
		content: m.content.map(block => {
			if (block.type === 'text') {
				return { type: 'text', text: block.text }
			} else if (block.type === 'tool_use') {
				return { type: 'tool_use', id: block.id, name: block.name, input: block.input }
			} else {
				return {
					type: 'tool_result',
					tool_use_id: block.tool_use_id,
					content: block.content,
					...(block.is_error !== undefined ? { is_error: block.is_error } : {})
				}
			}
		}) as Anthropic.MessageParam['content']
	}
}

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
		const anthropicTools = tools.map(t => ({
			name: t.name,
			description: t.description,
			input_schema: t.inputSchema as any
		}))
		const stream = this.client.messages.stream(
			{
				model: this.model,
				max_tokens: 4096,
				system: systemPrompt,
				messages: messages.map(toAnthropicMessage),
				...(anthropicTools.length ? { tools: anthropicTools } : {})
			},
			{ signal }
		)

		const pending = new Map<number, { id: string; name: string; json: string }>()

		for await (const ev of stream) {
			if (ev.type === 'content_block_start' && ev.content_block.type === 'tool_use') {
				pending.set(ev.index, {
					id: ev.content_block.id,
					name: ev.content_block.name,
					json: ''
				})
			} else if (ev.type === 'content_block_delta') {
				if (ev.delta.type === 'text_delta') {
					yield { type: 'text', delta: ev.delta.text }
				} else if (ev.delta.type === 'input_json_delta') {
					const p = pending.get(ev.index)
					if (p) p.json += ev.delta.partial_json
				}
			} else if (ev.type === 'content_block_stop') {
				const p = pending.get(ev.index)
				if (p) {
					pending.delete(ev.index)
					yield {
						type: 'tool_use',
						id: p.id,
						name: p.name,
						input: p.json ? JSON.parse(p.json) : {}
					}
				}
			}
		}

		const final = await stream.finalMessage()
		yield { type: 'done', stopReason: final.stop_reason === 'tool_use' ? 'tool_use' : 'end' }
	}
}
