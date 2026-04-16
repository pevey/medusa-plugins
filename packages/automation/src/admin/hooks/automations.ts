import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import {
	ActionsResponse,
	TriggersResponse,
	AutomationTrigger,
	AutomationReceipt,
	AutomationDelivery,
	SecretsListResponse,
	CreateSecretResponse,
	AutomationAction
} from '../types'

type AutomationQueryConfig = {
	id: string
	entity_name: string
	fields?: string[] | null
	filters?: Record<string, unknown> | null
	limit?: number | null
}

// ─── Triggers ─────────────────────────────────────────────────────────────────

export const useCreateAutomationTrigger = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch('/admin/automations', { method: 'POST', body: data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['automations'] })
		}
	})
}

export const useUpdateAutomationTrigger = (triggerId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/automations/${triggerId}`, { method: 'POST', body: data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['automations'] })
			queryClient.invalidateQueries({ queryKey: ['automation', triggerId] })
		}
	})
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export const useAutomationActions = (
	triggerId: string,
	params: { limit: number; offset: number }
) => {
	return useQuery<ActionsResponse>({
		queryFn: () =>
			sdk.client.fetch(`/admin/automations/${triggerId}/actions`, { query: params }),
		queryKey: ['automation', triggerId, 'actions', params.limit, params.offset]
	})
}

export const useCreateAutomationAction = (triggerId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch<{ action: AutomationAction }>(
				`/admin/automations/${triggerId}/actions`,
				{ method: 'POST', body: data }
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['automation', triggerId, 'actions'] })
		}
	})
}

export const useUpdateAutomationAction = (triggerId: string, actionId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/automations/${triggerId}/actions/${actionId}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['automation-action', actionId] })
			queryClient.invalidateQueries({ queryKey: ['automation', triggerId, 'actions'] })
		}
	})
}

export const useDeleteAutomationActions = (triggerId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch(`/admin/automations/${triggerId}/actions`, {
				method: 'DELETE',
				body: { ids }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['automation', triggerId, 'actions'] })
		}
	})
}

// ─── Action Query Config ───────────────────────────────────────────────────────

export const useAutomationActionQuery = (triggerId: string, actionId: string, enabled = true) => {
	return useQuery<{ query: AutomationQueryConfig | null }>({
		queryFn: () =>
			sdk.client.fetch(`/admin/automations/${triggerId}/actions/${actionId}/query`),
		queryKey: ['automation-action-query', actionId],
		enabled
	})
}

export const useUpsertAutomationActionQuery = (triggerId: string, actionId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (body: object) =>
			sdk.client.fetch(`/admin/automations/${triggerId}/actions/${actionId}/query`, {
				method: 'POST',
				body
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['automation-action-query', actionId] })
			queryClient.invalidateQueries({ queryKey: ['automation-action', actionId] })
		}
	})
}

export const useDeleteAutomationActionQuery = (triggerId: string, actionId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/automations/${triggerId}/actions/${actionId}/query`, {
				method: 'DELETE'
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['automation-action-query', actionId] })
			queryClient.invalidateQueries({ queryKey: ['automation-action', actionId] })
		}
	})
}

// ─── Secrets ──────────────────────────────────────────────────────────────────

export const useAutomationSecrets = (enabled = true) => {
	return useQuery<SecretsListResponse>({
		queryKey: ['automation-secrets'],
		queryFn: () => sdk.client.fetch('/admin/automations/secrets'),
		enabled
	})
}

export const useCreateAutomationSecret = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (label: string) =>
			sdk.client.fetch<CreateSecretResponse>('/admin/automations/secrets', {
				method: 'POST',
				body: { label }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['automation-secrets'] })
		}
	})
}

export const useAutomationTriggersList = (params: Record<string, unknown>) => {
	return useQuery<TriggersResponse>({
		queryFn: () => sdk.client.fetch('/admin/automations', { query: params }),
		queryKey: ['automations', params]
	})
}

export const useAutomationTrigger = (id: string | undefined) => {
	return useQuery<{ trigger: AutomationTrigger }>({
		queryFn: () => sdk.client.fetch(`/admin/automations/${id}`),
		queryKey: ['automation', id],
		enabled: !!id
	})
}

export const useDeleteAutomationTriggers = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/automations', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['automations'] })
		}
	})
}

export const useAutomationReceipts = (triggerId: string | undefined, enabled: boolean) => {
	return useQuery<{ receipts: AutomationReceipt[]; count: number }>({
		queryFn: () =>
			sdk.client.fetch(`/admin/automations/${triggerId}/receipts`, {
				query: { limit: 10, offset: 0 }
			}),
		queryKey: ['automation-receipts', triggerId],
		enabled: enabled && !!triggerId
	})
}

export const useAutomationAction = (triggerId: string | undefined, actionId: string | undefined) => {
	return useQuery<{ action: AutomationAction }>({
		queryFn: () =>
			sdk.client.fetch(`/admin/automations/${triggerId}/actions/${actionId}`),
		queryKey: ['automation-action', actionId],
		enabled: !!triggerId && !!actionId
	})
}

export const useAutomationDeliveries = (triggerId: string | undefined, actionId: string | undefined) => {
	return useQuery<{ deliveries: AutomationDelivery[]; count: number }>({
		queryFn: () =>
			sdk.client.fetch(
				`/admin/automations/${triggerId}/actions/${actionId}/deliveries`,
				{ query: { limit: 10, offset: 0 } }
			),
		queryKey: ['automation-action-deliveries', actionId],
		enabled: !!triggerId && !!actionId
	})
}

export const useDeleteAutomationSecret = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			sdk.client.fetch(`/admin/automations/secrets/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['automation-secrets'] })
		}
	})
}
