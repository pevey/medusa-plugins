// Pure, jest-importable message/block types + folding logic for the admin
// chat UI. NO React / no `import.meta` imports here — this module must be
// importable outside a Vite/browser context.
//
// The UI keeps a completed tool call as a single `tool_use` block carrying
// UI-only `result`/`is_error` fields so `chat-message.tsx` can render one
// card for it. The backend wire format (mirrored from
// `src/lib/llm-provider.ts` / `src/api/validators.ts`) instead represents a
// completed tool call as TWO messages: an `assistant` turn ending in a bare
// `tool_use` block, followed by a `user` turn carrying the paired
// `tool_result` block (see `src/api/admin/chat/route.ts` lines ~119/137).
// `foldToolResults` (below) is the inverse of that split, used to hydrate a
// persisted session's wire-shaped messages back into the UI's render shape.
// It also merges consecutive `assistant` messages into one, since live
// rendering appends every round of a multi-round turn onto a single
// assistant bubble (`[text, tool_use, text, tool_use, text]`) — hydration
// must match that shape rather than showing one bubble per stored round.

export type TextBlock = { type: 'text'; text: string }
export type ToolUseBlock = {
	type: 'tool_use'
	id: string
	name: string
	input: Record<string, unknown>
	// UI-only fields, attached once the matching `tool_result` SSE event
	// arrives (or hydrated by `foldToolResults` from a persisted session).
	// Never sent to the API directly.
	result?: string
	is_error?: boolean
}
export type ContentBlock = TextBlock | ToolUseBlock

export type ChatMessage = {
	role: 'user' | 'assistant'
	content: ContentBlock[]
}

// Wire types matching the backend's `ContentBlock` / validators.ts exactly.
export type WireToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
export type WireToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
export type WireContentBlock = TextBlock | WireToolUseBlock | WireToolResultBlock

export type WireMessage = {
	role: 'user' | 'assistant'
	content: WireContentBlock[]
}

/**
 * The backend persists a completed tool call as an `assistant` turn ending
 * in a bare `tool_use` block followed by a separate `user` turn carrying the
 * paired `tool_result` block. For rendering, `foldToolResults` attaches each
 * `tool_result` back onto its `tool_use` card (the Phase A render model
 * consumed by `chat-message.tsx`) and drops the now-empty
 * `tool_result`-only messages.
 */
export function foldToolResults(stored: WireMessage[]): ChatMessage[] {
	const results = new Map<string, { content: string; is_error?: boolean }>()
	for (const m of stored)
		for (const b of m.content)
			if (b.type === 'tool_result') results.set(b.tool_use_id, { content: b.content, is_error: b.is_error })

	const out: ChatMessage[] = []
	for (const m of stored) {
		const nonResult = m.content.filter((b): b is TextBlock | WireToolUseBlock => b.type !== 'tool_result')
		if (nonResult.length === 0) continue
		const content = nonResult.map((b): ContentBlock =>
			b.type === 'tool_use'
				? { ...b, result: results.get(b.id)?.content, is_error: results.get(b.id)?.is_error }
				: b
		)
		const prev = out[out.length - 1]
		if (m.role === 'assistant' && prev?.role === 'assistant') {
			prev.content = [...prev.content, ...content]
		} else {
			out.push({ role: m.role, content })
		}
	}
	return out
}
