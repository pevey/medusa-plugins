import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { Robot } from '@medusajs/icons'
import { Button, Container, Heading, Input, Text } from '@medusajs/ui'
import { useChat } from '../../hooks/chat'
import { ChatMessage } from '../../components/chat-message'

export const config = defineRouteConfig({
	label: 'Chat',
	icon: Robot
})

export const handle = { breadcrumb: () => 'Chat' }

type Message = {
	role: 'user' | 'assistant'
	content: string
	toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: string }>
}

const ChatPage = () => {
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const { mutate: sendChat, isPending } = useChat()

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	const handleSend = () => {
		const text = input.trim()
		if (!text || isPending) return

		const userMessage: Message = { role: 'user', content: text }
		const updatedMessages = [...messages, userMessage]
		setMessages(updatedMessages)
		setInput('')

		// Send only role+content to the API (strip toolCalls)
		const apiMessages = updatedMessages.map(({ role, content }) => ({ role, content }))

		sendChat(apiMessages, {
			onSuccess: (data) => {
				setMessages(prev => [
					...prev,
					{
						role: 'assistant',
						content: data.content,
						toolCalls: data.tool_calls
					}
				])
			},
			onError: (err) => {
				setMessages(prev => [
					...prev,
					{
						role: 'assistant',
						content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`
					}
				])
			}
		})
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	return (
		<div className="flex flex-col h-[calc(100vh-120px)] p-4">
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
						<ChatMessage
							key={i}
							role={msg.role}
							content={msg.content}
							toolCalls={msg.toolCalls}
						/>
					))}
					{isPending && (
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
							disabled={isPending}
							className="flex-1"
						/>
						<Button
							onClick={handleSend}
							disabled={!input.trim() || isPending}
							isLoading={isPending}
						>
							Send
						</Button>
					</div>
				</div>
			</Container>
		</div>
	)
}

export default ChatPage
