import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { Robot } from '@medusajs/icons'
import { Button, Container, Heading, Input, Text } from '@medusajs/ui'
import { useChat, type ChatMessage as ChatMessageType, type ContentBlock } from '../../hooks/chat'
import { useSessionMessages } from '../../hooks/sessions'
import { foldToolResults } from '../../lib/chat-messages'
import { ChatMessage } from '../../components/chat-message'
import { SessionSidebar } from '../../components/session-sidebar'

export const config = defineRouteConfig({
	label: 'Chat',
	icon: Robot
})

export const handle = { breadcrumb: () => 'Chat' }

// Immutably applies `updater` to the content of the trailing assistant
// message (the one currently being streamed into).
const updateTrailingAssistant = (
	messages: ChatMessageType[],
	updater: (content: ContentBlock[]) => ContentBlock[]
): ChatMessageType[] => {
	if (messages.length === 0) return messages
	const last = messages[messages.length - 1]
	if (last.role !== 'assistant') return messages
	return [...messages.slice(0, -1), { ...last, content: updater(last.content) }]
}

const ChatPage = () => {
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
	const [pendingOpenId, setPendingOpenId] = useState<string | null>(null)
	const [messages, setMessages] = useState<ChatMessageType[]>([])
	const [input, setInput] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const { send, stop, streaming } = useChat()
	// Only fetches when the user explicitly opens an existing session
	// (via onSelect). Deliberately NOT keyed off activeSessionId — that
	// also changes mid-stream via onSession, and hydrating from that
	// would overwrite the live-updating pane with partial DB state.
	const openQuery = useSessionMessages(pendingOpenId)
	const qc = useQueryClient()

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	// Opening a session: hydrate the pane from its persisted (wire-shaped)
	// messages, folding tool_result messages back onto their tool_use card.
	useEffect(() => {
		if (openQuery.data) {
			setMessages(foldToolResults(openQuery.data.messages))
			setActiveSessionId(pendingOpenId)
			setPendingOpenId(null)
		}
	}, [openQuery.data])

	const onNew = () => {
		if (streaming) return
		setActiveSessionId(null)
		setMessages([])
		setPendingOpenId(null)
	}

	const onSelect = (id: string) => {
		if (streaming) return
		if (id !== activeSessionId) setPendingOpenId(id)
	}

	const handleSend = () => {
		const text = input.trim()
		if (!text || streaming) return

		const userMessage: ChatMessageType = { role: 'user', content: [{ type: 'text', text }] }
		const assistantMessage: ChatMessageType = { role: 'assistant', content: [] }

		setMessages((prev) => [...prev, userMessage, assistantMessage])
		setInput('')

		send(
			{ session_id: activeSessionId, text },
			{
				onSession: (id) => {
					if (!activeSessionId) setActiveSessionId(id)
					qc.invalidateQueries({ queryKey: ['mcp-chat-sessions'] })
				},
				onText: (delta) => {
					setMessages((prev) =>
						updateTrailingAssistant(prev, (content) => {
							const last = content[content.length - 1]
							if (last?.type === 'text') {
								return [...content.slice(0, -1), { ...last, text: last.text + delta }]
							}
							return [...content, { type: 'text', text: delta }]
						})
					)
				},
				onToolCall: (call) => {
					setMessages((prev) =>
						updateTrailingAssistant(prev, (content) => [
							...content,
							{ type: 'tool_use', id: call.id, name: call.name, input: call.args }
						])
					)
				},
				onToolResult: (result) => {
					setMessages((prev) =>
						updateTrailingAssistant(prev, (content) =>
							content.map((b) =>
								b.type === 'tool_use' && b.id === result.id
									? { ...b, result: result.result, is_error: result.is_error }
									: b
							)
						)
					)
				},
				onDone: () => {
					qc.invalidateQueries({ queryKey: ['mcp-chat-sessions'] })
				},
				onError: (message) => {
					setMessages((prev) =>
						updateTrailingAssistant(prev, (content) => [
							...content,
							{ type: 'text', text: `\n\n**Error:** ${message}` }
						])
					)
				}
			}
		)
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	const lastMessage = messages[messages.length - 1]
	const isThinking = streaming && lastMessage?.role === 'assistant' && lastMessage.content.length === 0

	return (
		<div className="flex h-[calc(100vh-120px)] p-4 gap-4">
			<Container className="p-0 overflow-hidden">
				<SessionSidebar activeId={activeSessionId} onNew={onNew} onSelect={onSelect} disabled={streaming} />
			</Container>
			<Container className="flex flex-col flex-1 p-0 overflow-hidden">
				<div className="px-6 py-4 border-b border-ui-border-base">
					<Heading level="h1">Chat</Heading>
					<Text size="small" className="text-ui-fg-subtle mt-1">
						Ask questions about your store data or manage automations using natural language.
					</Text>
				</div>

				{/* Messages area */}
				<div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
					{messages.length === 0 && (
						<div className="flex-1 flex items-center justify-center">
							<Text size="small" className="text-ui-fg-muted">
								Send a message to get started. Try "Show me recent orders" or "List my automations."
							</Text>
						</div>
					)}
					{messages.map((msg, i) => (
						<ChatMessage key={i} message={msg} />
					))}
					{isThinking && (
						<div className="self-start">
							<Text size="small" className="text-ui-fg-muted animate-pulse">Thinking...</Text>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input area */}
				<div className="px-6 py-4 border-t border-ui-border-base">
					<div className="flex gap-2">
						<Input
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Ask a question..."
							disabled={streaming}
							className="flex-1"
						/>
						{streaming ? (
							<Button onClick={stop} variant="secondary">
								Stop
							</Button>
						) : (
							<Button onClick={handleSend} disabled={!input.trim()}>
								Send
							</Button>
						)}
					</div>
				</div>
			</Container>
		</div>
	)
}

export default ChatPage
