export type McpPluginOptions = {
	provider: 'anthropic' | 'openai'
	model: string
	apiKey?: string
	baseUrl?: string
	systemPrompt?: string
	/** Allow tools that perform write/dispatch actions (e.g. trigger automations). OFF by default. */
	allowWriteTools?: boolean
	/** Import specifiers of packages exporting `registerMcpTools(registry, scope)` to contribute tools. */
	toolPackages?: string[]
	/** Days of inactivity before a chat session is auto-purged. Default 30; <= 0 disables purging. */
	chatRetentionDays?: number
	/** Max recent user turns sent to the LLM per request. Default 10; <= 0 = unlimited. */
	maxHistoryTurns?: number
}

export type ChatSessionSummary = { id: string; title: string; last_message_at: string }
export type ChatMessageDTO = { role: 'user' | 'assistant'; content: unknown[] }
