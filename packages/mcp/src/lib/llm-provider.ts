export type ChatMessage = {
	role: 'user' | 'assistant'
	content: string
}

export type ToolDefinition = {
	name: string
	description: string
	inputSchema: Record<string, unknown>
}

export type ToolCall = {
	name: string
	args: Record<string, unknown>
}

export type LlmResponse = {
	content: string
	toolCalls: ToolCall[]
}

export interface LlmProvider {
	/**
	 * Send a single turn to the LLM. If the LLM wants to call tools,
	 * return the tool calls in the response.  The caller handles
	 * the tool-use loop.
	 */
	chat(params: {
		messages: ChatMessage[]
		tools: ToolDefinition[]
		systemPrompt: string
	}): Promise<LlmResponse>
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
		case 'ollama': {
			const { OllamaProvider } = require('./providers/ollama')
			return new OllamaProvider(options.model, options.baseUrl)
		}
		default:
			throw new Error(`Unknown LLM provider: ${options.provider}`)
	}
}
