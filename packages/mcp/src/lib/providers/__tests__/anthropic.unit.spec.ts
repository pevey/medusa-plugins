/// <reference types="jest" />
import { AnthropicProvider } from '../anthropic'
import type { ChatMessage, ToolDefinition, StreamEvent } from '../../llm-provider'

// ── Mocks ────────────────────────────────────────────────────────────────────

function fakeAnthropicStream(events: any[], finalMessage: any) {
	return {
		[Symbol.asyncIterator]: async function* () {
			for (const ev of events) yield ev
		},
		finalMessage: jest.fn().mockResolvedValue(finalMessage)
	}
}

function createProvider(streamImpl: jest.Mock): AnthropicProvider {
	const provider = new AnthropicProvider('claude-3-5-sonnet-latest', 'test-api-key')
	// Replace the real client with a fake one exposing only what chatStream uses
	;(provider as any).client = {
		messages: {
			stream: streamImpl
		}
	}
	return provider
}

async function collect(iterable: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
	const out: StreamEvent[] = []
	for await (const ev of iterable) out.push(ev)
	return out
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AnthropicProvider.chatStream', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('yields text deltas, an assembled tool_use block, and a done event mapping stop_reason=tool_use', async () => {
		const events = [
			{ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
			{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello ' } },
			{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'world' } },
			{ type: 'content_block_stop', index: 0 },
			{
				type: 'content_block_start',
				index: 1,
				content_block: { type: 'tool_use', id: 'tool_1', name: 'get_weather', input: {} }
			},
			{ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"city":' } },
			{ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '"NYC"}' } },
			{ type: 'content_block_stop', index: 1 }
		]
		const streamImpl = jest.fn().mockReturnValue(fakeAnthropicStream(events, { stop_reason: 'tool_use' }))
		const provider = createProvider(streamImpl)

		const messages: ChatMessage[] = [{ role: 'user', content: [{ type: 'text', text: 'What is the weather in NYC?' }] }]
		const tools: ToolDefinition[] = []

		const result = await collect(provider.chatStream({ messages, tools, systemPrompt: 'system' }))

		expect(result).toEqual([
			{ type: 'text', delta: 'Hello ' },
			{ type: 'text', delta: 'world' },
			{ type: 'tool_use', id: 'tool_1', name: 'get_weather', input: { city: 'NYC' } },
			{ type: 'done', stopReason: 'tool_use' }
		])
	})

	it('maps a non-tool_use stop_reason to done.stopReason "end"', async () => {
		const events = [{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hi' } }]
		const streamImpl = jest.fn().mockReturnValue(fakeAnthropicStream(events, { stop_reason: 'end_turn' }))
		const provider = createProvider(streamImpl)

		const result = await collect(
			provider.chatStream({ messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], tools: [], systemPrompt: 'sys' })
		)

		expect(result[result.length - 1]).toEqual({ type: 'done', stopReason: 'end' })
	})

	it('handles a tool_use block with no input_json_delta as an empty object', async () => {
		const events = [
			{ type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tool_2', name: 'no_args', input: {} } },
			{ type: 'content_block_stop', index: 0 }
		]
		const streamImpl = jest.fn().mockReturnValue(fakeAnthropicStream(events, { stop_reason: 'tool_use' }))
		const provider = createProvider(streamImpl)

		const result = await collect(
			provider.chatStream({ messages: [{ role: 'user', content: [{ type: 'text', text: 'go' }] }], tools: [], systemPrompt: 'sys' })
		)

		expect(result[0]).toEqual({ type: 'tool_use', id: 'tool_2', name: 'no_args', input: {} })
	})

	it('translates ChatMessage content blocks into native Anthropic messages, including tool_result blocks', async () => {
		const streamImpl = jest.fn().mockReturnValue(fakeAnthropicStream([], { stop_reason: 'end_turn' }))
		const provider = createProvider(streamImpl)

		const messages: ChatMessage[] = [
			{ role: 'user', content: [{ type: 'text', text: 'What is the weather?' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Let me check.' },
					{ type: 'tool_use', id: 'tool_1', name: 'get_weather', input: { city: 'NYC' } }
				]
			},
			{
				role: 'user',
				content: [{ type: 'tool_result', tool_use_id: 'tool_1', content: '72F and sunny', is_error: false }]
			}
		]

		await collect(provider.chatStream({ messages, tools: [], systemPrompt: 'sys' }))

		expect(streamImpl).toHaveBeenCalledTimes(1)
		const callArgs = streamImpl.mock.calls[0][0]
		expect(callArgs.messages).toEqual([
			{ role: 'user', content: [{ type: 'text', text: 'What is the weather?' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Let me check.' },
					{ type: 'tool_use', id: 'tool_1', name: 'get_weather', input: { city: 'NYC' } }
				]
			},
			{
				role: 'user',
				content: [{ type: 'tool_result', tool_use_id: 'tool_1', content: '72F and sunny', is_error: false }]
			}
		])
	})

	it('passes the abort signal through to the underlying stream call', async () => {
		const streamImpl = jest.fn().mockReturnValue(fakeAnthropicStream([], { stop_reason: 'end_turn' }))
		const provider = createProvider(streamImpl)
		const controller = new AbortController()

		await collect(
			provider.chatStream({
				messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
				tools: [],
				systemPrompt: 'sys',
				signal: controller.signal
			})
		)

		expect(streamImpl).toHaveBeenCalledWith(expect.any(Object), { signal: controller.signal })
	})

	it('omits the tools param when no tools are provided, and includes it when tools are provided', async () => {
		const streamImpl = jest.fn().mockReturnValue(fakeAnthropicStream([], { stop_reason: 'end_turn' }))
		const provider = createProvider(streamImpl)

		await collect(
			provider.chatStream({ messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], tools: [], systemPrompt: 'sys' })
		)
		expect(streamImpl.mock.calls[0][0].tools).toBeUndefined()

		const tools: ToolDefinition[] = [{ name: 'get_weather', description: 'gets weather', inputSchema: { type: 'object' } }]
		await collect(
			provider.chatStream({ messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], tools, systemPrompt: 'sys' })
		)
		expect(streamImpl.mock.calls[1][0].tools).toEqual([
			{ name: 'get_weather', description: 'gets weather', input_schema: { type: 'object' } }
		])
	})
})
