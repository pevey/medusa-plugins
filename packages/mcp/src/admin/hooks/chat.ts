import { useCallback, useRef, useState } from 'react'
import type { ChatMessage, ContentBlock, TextBlock, ToolUseBlock } from '../lib/chat-messages'

// Re-exported so existing consumers of this hook can keep importing the UI
// message/block types from `hooks/chat.ts`. The actual type logic lives in
// `../lib/chat-messages` (a pure module with no React / `import.meta`
// imports, so it can be unit-tested under jest).
export type { ChatMessage, ContentBlock, TextBlock, ToolUseBlock }

export type ToolCallEvent = { id: string; name: string; args: Record<string, unknown> }
export type ToolResultEvent = { id: string; result: string; is_error: boolean }

export type ChatCallbacks = {
	onSession?: (id: string, title: string) => void
	onText: (delta: string) => void
	onToolCall: (call: ToolCallEvent) => void
	onToolResult: (result: ToolResultEvent) => void
	onDone: () => void
	onError: (message: string) => void
}

const parseFrame = (frame: string): { event: string; data: unknown } | null => {
	let event = 'message'
	const dataLines: string[] = []
	for (const line of frame.split('\n')) {
		if (line.startsWith('event:')) {
			event = line.slice('event:'.length).trim()
		} else if (line.startsWith('data:')) {
			dataLines.push(line.slice('data:'.length).trim())
		}
	}
	if (dataLines.length === 0) return null
	try {
		return { event, data: JSON.parse(dataLines.join('\n')) }
	} catch {
		return null
	}
}

export const useChat = () => {
	const [streaming, setStreaming] = useState(false)
	const controllerRef = useRef<AbortController | null>(null)

	const stop = useCallback(() => {
		controllerRef.current?.abort()
	}, [])

	const send = useCallback(async ({ session_id, text }: { session_id: string | null; text: string }, callbacks: ChatCallbacks) => {
		const controller = new AbortController()
		controllerRef.current = controller
		setStreaming(true)

		try {
			let res: Response
			try {
				res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/admin/chat`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ session_id: session_id ?? undefined, text }),
					signal: controller.signal
				})
			} catch (err) {
				if (err instanceof DOMException && err.name === 'AbortError') return
				callbacks.onError(err instanceof Error ? err.message : 'Failed to reach the server')
				return
			}

			const contentType = res.headers.get('content-type') ?? ''

			// The route can fail before it starts streaming (bad config, init
			// error) and reply with a plain, non-OK JSON body instead of SSE.
			if (!res.ok || !contentType.includes('text/event-stream') || !res.body) {
				let message = `Request failed with status ${res.status}`
				try {
					const body = await res.json()
					if (body?.error) message = body.error
				} catch {
					// body wasn't JSON either; fall back to the status message
				}
				callbacks.onError(message)
				return
			}

			const reader = res.body.getReader()
			const decoder = new TextDecoder()
			let buffer = ''

			const processFrames = (frames: string[]) => {
				for (const raw of frames) {
					if (!raw.trim()) continue
					const parsed = parseFrame(raw)
					if (!parsed) continue
					const { event, data } = parsed as { event: string; data: any }

					switch (event) {
						case 'session':
							callbacks.onSession?.(data.id, data.title)
							break
						case 'text':
							callbacks.onText(data.delta ?? '')
							break
						case 'tool_call':
							callbacks.onToolCall({
								id: data.id,
								name: data.name,
								args: data.args ?? {}
							})
							break
						case 'tool_result':
							callbacks.onToolResult({
								id: data.id,
								result: data.result,
								is_error: !!data.is_error
							})
							break
						case 'done':
							callbacks.onDone()
							break
						case 'error':
							callbacks.onError(data.message ?? 'Something went wrong')
							break
						default:
							break
					}
				}
			}

			while (true) {
				const { done, value } = await reader.read()
				if (done) {
					// Flush any buffered multi-byte char plus whatever complete frame
					// is still sitting in `buffer` — the backend always terminates
					// frames with `\n\n`, but a truncated final chunk could otherwise
					// silently drop the last (often `done`) frame.
					buffer += decoder.decode()
					const frames = buffer.split('\n\n')
					buffer = ''
					processFrames(frames)
					break
				}
				buffer += decoder.decode(value, { stream: true })

				const frames = buffer.split('\n\n')
				buffer = frames.pop() ?? ''
				processFrames(frames)
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				// user-initiated stop via `stop()` — not an error
				return
			}
			callbacks.onError(err instanceof Error ? err.message : 'Something went wrong')
		} finally {
			setStreaming(false)
			controllerRef.current = null
		}
	}, [])

	return { send, stop, streaming }
}
