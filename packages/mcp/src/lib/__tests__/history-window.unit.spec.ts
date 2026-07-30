import { windowHistory, dropUnpairedToolUse } from '../history-window'
import type { ChatMessage } from '../llm-provider'

const userText = (t: string): ChatMessage => ({
	role: 'user',
	content: [{ type: 'text', text: t }]
})
const asstText = (t: string): ChatMessage => ({
	role: 'assistant',
	content: [{ type: 'text', text: t }]
})
// a tool-heavy turn: user question, assistant text+tool_use, tool_result (role user), assistant answer
const toolTurn = (q: string, id: string): ChatMessage[] => [
	userText(q),
	{
		role: 'assistant',
		content: [
			{ type: 'text', text: 'let me check' },
			{ type: 'tool_use', id, name: 'get', input: {} }
		]
	},
	{ role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: '42' }] },
	asstText('the answer is 42')
]

describe('windowHistory', () => {
	it('returns everything when turns <= maxTurns', () => {
		const msgs = [...toolTurn('a', 't1'), ...toolTurn('b', 't2')]
		expect(windowHistory(msgs, 5)).toEqual(msgs)
	})

	it('keeps only the last maxTurns user turns, starting on a user-text boundary', () => {
		const msgs = [userText('one'), asstText('r1'), userText('two'), asstText('r2'), userText('three'), asstText('r3')]
		const out = windowHistory(msgs, 2)
		expect(out).toEqual([userText('two'), asstText('r2'), userText('three'), asstText('r3')])
	})

	it('never splits a tool_use from its tool_result at the window edge', () => {
		const msgs = [...toolTurn('old', 'tOld'), ...toolTurn('new', 'tNew')]
		const out = windowHistory(msgs, 1)
		// the whole "new" tool turn survives intact; the first message is a user-text question, not a tool_result
		expect(out).toEqual(toolTurn('new', 'tNew'))
		expect(out[0].content[0].type).toBe('text')
		expect(out.some(m => m.content.some(b => b.type === 'tool_use'))).toBe(true)
		expect(out.some(m => m.content.some(b => b.type === 'tool_result'))).toBe(true)
	})

	it('treats maxTurns <= 0 as unlimited', () => {
		const msgs = [userText('a'), asstText('r1'), userText('b'), asstText('r2')]
		expect(windowHistory(msgs, 0)).toEqual(msgs)
		expect(windowHistory(msgs, -5)).toEqual(msgs)
	})
})

describe('dropUnpairedToolUse', () => {
	it("drops a tool_use with no following tool_result, keeping the message's text", () => {
		const msgs: ChatMessage[] = [
			userText('q'),
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'let me check' },
					{ type: 'tool_use', id: 'dangling', name: 'get', input: {} }
				]
			}
		]
		expect(dropUnpairedToolUse(msgs)).toEqual([userText('q'), { role: 'assistant', content: [{ type: 'text', text: 'let me check' }] }])
	})

	it('drops the whole message when it would be left empty (tool_use-only)', () => {
		const msgs: ChatMessage[] = [
			userText('q'),
			{
				role: 'assistant',
				content: [{ type: 'tool_use', id: 'dangling', name: 'get', input: {} }]
			}
		]
		expect(dropUnpairedToolUse(msgs)).toEqual([userText('q')])
	})

	it('leaves a normal complete turn (tool_use with a matching tool_result) unchanged', () => {
		const msgs = toolTurn('a', 't1')
		expect(dropUnpairedToolUse(msgs)).toEqual(msgs)
	})
})
