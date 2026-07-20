/// <reference types="jest" />
import { foldToolResults } from '../chat-messages'

describe('foldToolResults', () => {
	it('folds a tool_result into its tool_use card and drops the tool_result message', () => {
		const stored = [
			{ role: 'user', content: [{ type: 'text', text: 'q' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'checking' }, { type: 'tool_use', id: 't1', name: 'get', input: {} }] },
			{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '42', is_error: false }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'it is 42' }] },
		] as any
		const out = foldToolResults(stored)
		// The trailing plain-text assistant message is a second round of the same
		// turn, so it merges into the tool_use round's bubble (Fix 2: hydration
		// must render a multi-round turn as ONE assistant bubble, matching live).
		expect(out).toEqual([
			{ role: 'user', content: [{ type: 'text', text: 'q' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'checking' },
					{ type: 'tool_use', id: 't1', name: 'get', input: {}, result: '42', is_error: false },
					{ type: 'text', text: 'it is 42' },
				],
			},
		])
	})

	it('ignores a tool_result with no matching tool_use (its message is dropped)', () => {
		const stored = [{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'orphan' }] }] as any
		expect(foldToolResults(stored)).toEqual([])
	})

	it('merges a multi-round turn into ONE assistant bubble, matching the live render', () => {
		const stored = [
			{ role: 'user', content: [{ type: 'text', text: 'text' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'text' }, { type: 'tool_use', id: 't1', name: 'get', input: {} }] },
			{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'result' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'text' }, { type: 'tool_use', id: 't2', name: 'get', input: {} }] },
			{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't2', content: 'result' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'text' }] },
		] as any
		const out = foldToolResults(stored)
		expect(out).toEqual([
			{ role: 'user', content: [{ type: 'text', text: 'text' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'text' },
					{ type: 'tool_use', id: 't1', name: 'get', input: {}, result: 'result', is_error: undefined },
					{ type: 'text', text: 'text' },
					{ type: 'tool_use', id: 't2', name: 'get', input: {}, result: 'result', is_error: undefined },
					{ type: 'text', text: 'text' },
				],
			},
		])
	})
})
