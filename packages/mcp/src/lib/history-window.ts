import type { ChatMessage } from './llm-provider'

/**
 * Sanitize loaded history against a dangling `tool_use` with no paired
 * `tool_result` (e.g. a client disconnect or DB error between persisting a
 * round's `assistant:[text, tool_use]` and its `user:[tool_result]`). Without
 * this, resending that history on every future turn gets a 400 from the
 * provider. Pure: returns a new array, never mutates the input.
 */
export function dropUnpairedToolUse(messages: ChatMessage[]): ChatMessage[] {
	const pairedIds = new Set<string>()
	for (const m of messages)
		for (const b of m.content)
			if (b.type === 'tool_result') pairedIds.add(b.tool_use_id)

	const out: ChatMessage[] = []
	for (const m of messages) {
		const content = m.content.filter(b => b.type !== 'tool_use' || pairedIds.has(b.id))
		if (content.length === 0) continue
		out.push({ ...m, content })
	}
	return out
}

/**
 * Cap what is sent to the LLM to the last `maxTurns` user turns. A "turn" begins
 * at a real user-text message (a user question), not at a tool_result-only user
 * message — so the window always starts on a clean boundary and never splits a
 * tool_use from its following tool_result. `maxTurns <= 0` means unlimited.
 * The full conversation is still persisted/displayed; only the LLM input is windowed.
 */
export function windowHistory(messages: ChatMessage[], maxTurns: number): ChatMessage[] {
	if (maxTurns <= 0) return messages
	const isTurnStart = (m: ChatMessage) =>
		m.role === 'user' && m.content.some(b => b.type === 'text')
	const starts: number[] = []
	messages.forEach((m, i) => { if (isTurnStart(m)) starts.push(i) })
	if (starts.length <= maxTurns) return messages
	return messages.slice(starts[starts.length - maxTurns])
}
