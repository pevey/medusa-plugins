import { useMutation } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'

type ChatMessage = {
	role: 'user' | 'assistant'
	content: string
}

type ChatResponse = {
	role: 'assistant'
	content: string
	tool_calls?: Array<{
		name: string
		args: Record<string, unknown>
		result: string
	}>
}

export const useChat = () => {
	return useMutation({
		mutationFn: (messages: ChatMessage[]) =>
			sdk.client.fetch<ChatResponse>('/admin/chat', {
				method: 'POST',
				body: { messages }
			})
	})
}
