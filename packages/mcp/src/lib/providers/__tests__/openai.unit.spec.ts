/// <reference types="jest" />
import { OpenAiProvider } from '../openai'
import type { ChatMessage, ToolDefinition, StreamEvent } from '../../llm-provider'

// ── Mocks ────────────────────────────────────────────────────────────────────

function fakeOpenAiStream(chunks: any[]) {
	return {
		[Symbol.asyncIterator]: async function* () {
			for (const c of chunks) yield c
		}
	}
}

function createProvider(createImpl: jest.Mock): OpenAiProvider {
	const provider = new OpenAiProvider('gpt-4o', 'test-api-key')
	// Replace the real client with a fake one exposing only what chatStream uses
	;(provider as any).client = {
		chat: {
			completions: {
				create: createImpl
			}
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

describe('OpenAiProvider.chatStream', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('yields text deltas, accumulated tool_use, and a done event mapping finish_reason=tool_calls', async () => {
		const chunks = [
			{ choices: [{ delta: { content: 'Hello ' }, finish_reason: null }] },
			{ choices: [{ delta: { content: 'world' }, finish_reason: null }] },
			{
				choices: [
					{
						delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'get_weather', arguments: '' } }] },
						finish_reason: null
					}
				]
			},
			{ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"city":' } }] }, finish_reason: null }] },
			{ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"NYC"}' } }] }, finish_reason: null }] },
			{ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }
		]
		const createImpl = jest.fn().mockResolvedValue(fakeOpenAiStream(chunks))
		const provider = createProvider(createImpl)

		const messages: ChatMessage[] = [{ role: 'user', content: [{ type: 'text', text: 'What is the weather in NYC?' }] }]
		const result = await collect(provider.chatStream({ messages, tools: [], systemPrompt: 'system' }))

		expect(result).toEqual([
			{ type: 'text', delta: 'Hello ' },
			{ type: 'text', delta: 'world' },
			{ type: 'tool_use', id: 'call_1', name: 'get_weather', input: { city: 'NYC' } },
			{ type: 'done', stopReason: 'tool_use' }
		])
	})

	it('maps finish_reason="stop" to done.stopReason "end" and yields no tool_use events', async () => {
		const chunks = [
			{ choices: [{ delta: { content: 'hi there' }, finish_reason: null }] },
			{ choices: [{ delta: {}, finish_reason: 'stop' }] }
		]
		const createImpl = jest.fn().mockResolvedValue(fakeOpenAiStream(chunks))
		const provider = createProvider(createImpl)

		const result = await collect(
			provider.chatStream({ messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], tools: [], systemPrompt: 'sys' })
		)

		expect(result).toEqual([{ type: 'text', delta: 'hi there' }, { type: 'done', stopReason: 'end' }])
	})

	it('assembles multiple concurrent tool calls by index, in index order', async () => {
		const chunks = [
			{
				choices: [
					{
						delta: {
							tool_calls: [
								{ index: 0, id: 'call_a', function: { name: 'tool_a', arguments: '' } },
								{ index: 1, id: 'call_b', function: { name: 'tool_b', arguments: '' } }
							]
						},
						finish_reason: null
					}
				]
			},
			{
				choices: [
					{
						delta: {
							tool_calls: [
								{ index: 0, function: { arguments: '{"x":1}' } },
								{ index: 1, function: { arguments: '{"y":2}' } }
							]
						},
						finish_reason: null
					}
				]
			},
			{ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }
		]
		const createImpl = jest.fn().mockResolvedValue(fakeOpenAiStream(chunks))
		const provider = createProvider(createImpl)

		const result = await collect(
			provider.chatStream({ messages: [{ role: 'user', content: [{ type: 'text', text: 'go' }] }], tools: [], systemPrompt: 'sys' })
		)

		expect(result).toEqual([
			{ type: 'tool_use', id: 'call_a', name: 'tool_a', input: { x: 1 } },
			{ type: 'tool_use', id: 'call_b', name: 'tool_b', input: { y: 2 } },
			{ type: 'done', stopReason: 'tool_use' }
		])
	})

	it('translates ChatMessage blocks: assistant text+tool_use -> one message with tool_calls; tool_result -> its own role:"tool" message', async () => {
		const createImpl = jest.fn().mockResolvedValue(fakeOpenAiStream([{ choices: [{ delta: {}, finish_reason: 'stop' }] }]))
		const provider = createProvider(createImpl)

		const messages: ChatMessage[] = [
			{ role: 'user', content: [{ type: 'text', text: 'What is the weather?' }] },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Let me check.' },
					{ type: 'tool_use', id: 'call_1', name: 'get_weather', input: { city: 'NYC' } }
				]
			},
			{
				role: 'user',
				content: [{ type: 'tool_result', tool_use_id: 'call_1', content: '72F and sunny' }]
			}
		]

		await collect(provider.chatStream({ messages, tools: [], systemPrompt: 'system prompt' }))

		expect(createImpl).toHaveBeenCalledTimes(1)
		const callArgs = createImpl.mock.calls[0][0]
		expect(callArgs.messages).toEqual([
			{ role: 'system', content: 'system prompt' },
			{ role: 'user', content: 'What is the weather?' },
			{
				role: 'assistant',
				content: 'Let me check.',
				tool_calls: [
					{ id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: JSON.stringify({ city: 'NYC' }) } }
				]
			},
			{ role: 'tool', tool_call_id: 'call_1', content: '72F and sunny' }
		])
	})

	it('passes the abort signal and stream:true through to the underlying create call', async () => {
		const createImpl = jest.fn().mockResolvedValue(fakeOpenAiStream([{ choices: [{ delta: {}, finish_reason: 'stop' }] }]))
		const provider = createProvider(createImpl)
		const controller = new AbortController()

		await collect(
			provider.chatStream({
				messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
				tools: [],
				systemPrompt: 'sys',
				signal: controller.signal
			})
		)

		expect(createImpl).toHaveBeenCalledWith(expect.objectContaining({ stream: true }), { signal: controller.signal })
	})

	it('omits the tools param when no tools are provided, and includes it when tools are provided', async () => {
		const createImpl = jest.fn().mockResolvedValue(fakeOpenAiStream([{ choices: [{ delta: {}, finish_reason: 'stop' }] }]))
		const provider = createProvider(createImpl)

		await collect(
			provider.chatStream({ messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], tools: [], systemPrompt: 'sys' })
		)
		expect(createImpl.mock.calls[0][0].tools).toBeUndefined()

		const tools: ToolDefinition[] = [{ name: 'get_weather', description: 'gets weather', inputSchema: { type: 'object' } }]
		await collect(
			provider.chatStream({ messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], tools, systemPrompt: 'sys' })
		)
		expect(createImpl.mock.calls[1][0].tools).toEqual([
			{ type: 'function', function: { name: 'get_weather', description: 'gets weather', parameters: { type: 'object' } } }
		])
	})
})
