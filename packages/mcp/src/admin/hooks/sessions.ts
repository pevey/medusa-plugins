import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import type { ChatMessage } from '../lib/chat-messages'
import type { DeleteSessionResponse, SessionsListResponse, SessionDetailResponse, SessionSummary } from '../types'

// Response shapes for `GET /admin/chat/sessions`, `GET
// /admin/chat/sessions/:id`, and `DELETE /admin/chat/sessions/:id` now live in
// `../types` (previously the first two were only inline anonymous generics on
// `useQuery<...>` here, and the third had no type at all -- `useMutation` with
// no generic, so its result was implicitly `unknown`). Re-exported here so
// existing consumers (e.g. `components/session-sidebar.tsx`) can keep
// importing `SessionSummary` from this hooks module.
export type { DeleteSessionResponse, SessionsListResponse, SessionDetailResponse, SessionSummary }

export const useSessions = () =>
	useQuery<SessionsListResponse>({
		queryKey: ['mcp-chat-sessions'],
		queryFn: () => sdk.client.fetch('/admin/chat/sessions')
	})

export const useSessionMessages = (id: string | null) =>
	useQuery<SessionDetailResponse>({
		queryKey: ['mcp-chat-session', id],
		queryFn: () => sdk.client.fetch(`/admin/chat/sessions/${id}`),
		enabled: !!id
	})

export const useDeleteSession = () => {
	const qc = useQueryClient()
	return useMutation<DeleteSessionResponse, Error, string>({
		mutationFn: (id: string) => sdk.client.fetch(`/admin/chat/sessions/${id}`, { method: 'DELETE' }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['mcp-chat-sessions'] })
	})
}
