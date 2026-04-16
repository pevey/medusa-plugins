export type McpPluginOptions = {
	provider: 'anthropic' | 'openai' | 'ollama'
	model: string
	apiKey?: string
	baseUrl?: string
	systemPrompt?: string
}
