export type TextBlock = { type: 'text'; text: string }
export type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
export type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

export type ChatMessage = {
	role: 'user' | 'assistant'
	content: ContentBlock[]
}

export type ToolDefinition = {
	name: string
	description: string
	inputSchema: Record<string, unknown>
}

export type StreamEvent =
	| { type: 'text'; delta: string }
	| { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
	| { type: 'done'; stopReason: 'end' | 'tool_use' }

export interface LlmProvider {
	/**
	 * Stream a single turn from the LLM. Yields text deltas and tool-use
	 * blocks as they arrive, terminating with a `done` event carrying the
	 * stop reason. The caller handles the tool-use loop.
	 */
	chatStream(params: {
		messages: ChatMessage[]
		tools: ToolDefinition[]
		systemPrompt: string
		signal?: AbortSignal
	}): AsyncIterable<StreamEvent>
}

import type { McpPluginOptions } from '../types'
export type { McpPluginOptions }

export function createProvider(options: McpPluginOptions): LlmProvider {
	switch (options.provider) {
		case 'anthropic': {
			const { AnthropicProvider } = require('./providers/anthropic')
			return new AnthropicProvider(options.model, options.apiKey!, options.baseUrl)
		}
		case 'openai': {
			const { OpenAiProvider } = require('./providers/openai')
			return new OpenAiProvider(options.model, options.apiKey!, options.baseUrl)
		}
		default:
			throw new Error(`Unknown LLM provider: ${options.provider}`)
	}
}
