import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import type {
	AdminRubricsResponse, AdminRubricResponse,
	AdminFunnelsResponse, AdminFunnelResponse, AdminFunnelQueryResponse,
	AdminEventsResponse
} from '../types/analytics'

// ── Rubrics ─────────────────────────────────────────────────────────────────

export const useRubrics = (params: Record<string, unknown>) => {
	return useQuery<AdminRubricsResponse>({
		queryFn: () => sdk.client.fetch('/admin/analytics/rubrics', { query: params }),
		queryKey: ['analytics-rubrics', params]
	})
}

export const useRubric = (id: string | undefined) => {
	return useQuery<AdminRubricResponse>({
		queryFn: () => sdk.client.fetch(`/admin/analytics/rubrics/${id}`),
		queryKey: ['analytics-rubric', id],
		enabled: !!id
	})
}

export const useCreateRubric = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch<AdminRubricResponse>('/admin/analytics/rubrics', { method: 'POST', body: data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['analytics-rubrics'] })
		}
	})
}

export const useUpdateRubric = (id: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch<AdminRubricResponse>(`/admin/analytics/rubrics/${id}`, { method: 'POST', body: data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['analytics-rubrics'] })
			queryClient.invalidateQueries({ queryKey: ['analytics-rubric', id] })
		}
	})
}

export const useDeleteRubrics = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/analytics/rubrics', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['analytics-rubrics'] })
		}
	})
}

// ── Events ──────────────────────────────────────────────────────────────────

export const useEvents = (params: Record<string, unknown>) => {
	return useQuery<AdminEventsResponse>({
		queryFn: () => sdk.client.fetch('/admin/analytics/events', { query: params }),
		queryKey: ['analytics-events', params],
		enabled: !!params.event
	})
}

// ── Funnels ─────────────────────────────────────────────────────────────────

export const useFunnels = (params?: Record<string, unknown>) => {
	return useQuery<AdminFunnelsResponse>({
		queryFn: () => sdk.client.fetch('/admin/analytics/funnels', { query: params }),
		queryKey: ['analytics-funnels', params]
	})
}

export const useFunnel = (id: string | undefined) => {
	return useQuery<AdminFunnelResponse>({
		queryFn: () => sdk.client.fetch(`/admin/analytics/funnels/${id}`),
		queryKey: ['analytics-funnel', id],
		enabled: !!id
	})
}

export const useCreateFunnel = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch<AdminFunnelResponse>('/admin/analytics/funnels', { method: 'POST', body: data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['analytics-funnels'] })
			queryClient.invalidateQueries({ queryKey: ['analytics-funnel-query'] })
		}
	})
}

export const useUpdateFunnel = (id: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch<AdminFunnelResponse>(`/admin/analytics/funnels/${id}`, { method: 'POST', body: data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['analytics-funnels'] })
			queryClient.invalidateQueries({ queryKey: ['analytics-funnel', id] })
			queryClient.invalidateQueries({ queryKey: ['analytics-funnel-query'] })
		}
	})
}

export const useDeleteFunnels = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/analytics/funnels', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['analytics-funnels'] })
			queryClient.invalidateQueries({ queryKey: ['analytics-funnel-query'] })
		}
	})
}

// ── Funnel Query ────────────────────────────────────────────────────────────

export const useFunnelQuery = (params: Record<string, unknown>) => {
	return useQuery<AdminFunnelQueryResponse>({
		queryFn: () => sdk.client.fetch('/admin/analytics/funnel', { query: params }),
		queryKey: ['analytics-funnel-query', params]
	})
}
