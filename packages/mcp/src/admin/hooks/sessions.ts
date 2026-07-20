import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import type { ChatMessage, WireMessage } from '../lib/chat-messages'

export type SessionSummary = { id: string; title: string; last_message_at: string }

export const useSessions = () =>
	useQuery<{ sessions: SessionSummary[] }>({
		queryKey: ['mcp-chat-sessions'],
		queryFn: () => sdk.client.fetch('/admin/chat/sessions')
	})

export const useSessionMessages = (id: string | null) =>
	useQuery<{ session: { id: string; title: string }; messages: WireMessage[] }>({
		queryKey: ['mcp-chat-session', id],
		queryFn: () => sdk.client.fetch(`/admin/chat/sessions/${id}`),
		enabled: !!id
	})

export const useDeleteSession = () => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => sdk.client.fetch(`/admin/chat/sessions/${id}`, { method: 'DELETE' }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['mcp-chat-sessions'] })
	})
}
