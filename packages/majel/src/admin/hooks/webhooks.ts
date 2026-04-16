import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import {
	ActionsResponse,
	TriggersResponse,
	WebhookTrigger,
	WebhookReceipt,
	WebhookDelivery,
	SecretsListResponse,
	CreateSecretResponse,
	WebhookAction
} from '../types'

type WebhookQueryConfig = {
	id: string
	entity_name: string
	fields?: string[] | null
	filters?: Record<string, unknown> | null
	limit?: number | null
}

// ─── Triggers ─────────────────────────────────────────────────────────────────

export const useCreateWebhookTrigger = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch('/admin/webhook-triggers', { method: 'POST', body: data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhook-triggers'] })
		}
	})
}

export const useUpdateWebhookTrigger = (triggerId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/webhook-triggers/${triggerId}`, { method: 'POST', body: data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhook-triggers'] })
			queryClient.invalidateQueries({ queryKey: ['webhook-trigger', triggerId] })
		}
	})
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export const useWebhookActions = (
	triggerId: string,
	params: { limit: number; offset: number }
) => {
	return useQuery<ActionsResponse>({
		queryFn: () =>
			sdk.client.fetch(`/admin/webhook-triggers/${triggerId}/actions`, { query: params }),
		queryKey: ['webhook-trigger', triggerId, 'actions', params.limit, params.offset]
	})
}

export const useCreateWebhookAction = (triggerId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch<{ action: WebhookAction }>(
				`/admin/webhook-triggers/${triggerId}/actions`,
				{ method: 'POST', body: data }
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhook-trigger', triggerId, 'actions'] })
		}
	})
}

export const useUpdateWebhookAction = (triggerId: string, actionId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/webhook-triggers/${triggerId}/actions/${actionId}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhook-action', actionId] })
			queryClient.invalidateQueries({ queryKey: ['webhook-trigger', triggerId, 'actions'] })
		}
	})
}

export const useDeleteWebhookActions = (triggerId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch(`/admin/webhook-triggers/${triggerId}/actions`, {
				method: 'DELETE',
				body: { ids }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhook-trigger', triggerId, 'actions'] })
		}
	})
}

// ─── Action Query Config ───────────────────────────────────────────────────────

export const useWebhookActionQuery = (triggerId: string, actionId: string, enabled = true) => {
	return useQuery<{ query: WebhookQueryConfig | null }>({
		queryFn: () =>
			sdk.client.fetch(`/admin/webhook-triggers/${triggerId}/actions/${actionId}/query`),
		queryKey: ['webhook-action-query', actionId],
		enabled
	})
}

export const useUpsertWebhookActionQuery = (triggerId: string, actionId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (body: object) =>
			sdk.client.fetch(`/admin/webhook-triggers/${triggerId}/actions/${actionId}/query`, {
				method: 'POST',
				body
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhook-action-query', actionId] })
			queryClient.invalidateQueries({ queryKey: ['webhook-action', actionId] })
		}
	})
}

export const useDeleteWebhookActionQuery = (triggerId: string, actionId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/webhook-triggers/${triggerId}/actions/${actionId}/query`, {
				method: 'DELETE'
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhook-action-query', actionId] })
			queryClient.invalidateQueries({ queryKey: ['webhook-action', actionId] })
		}
	})
}

// ─── Secrets ──────────────────────────────────────────────────────────────────

export const useWebhookSecrets = (enabled = true) => {
	return useQuery<SecretsListResponse>({
		queryKey: ['webhook-secrets'],
		queryFn: () => sdk.client.fetch('/admin/webhook-secrets'),
		enabled
	})
}

export const useCreateWebhookSecret = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (label: string) =>
			sdk.client.fetch<CreateSecretResponse>('/admin/webhook-secrets', {
				method: 'POST',
				body: { label }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhook-secrets'] })
		}
	})
}

export const useWebhookTriggersList = (params: Record<string, unknown>) => {
	return useQuery<TriggersResponse>({
		queryFn: () => sdk.client.fetch('/admin/webhook-triggers', { query: params }),
		queryKey: ['webhook-triggers', params]
	})
}

export const useWebhookTrigger = (id: string | undefined) => {
	return useQuery<{ trigger: WebhookTrigger }>({
		queryFn: () => sdk.client.fetch(`/admin/webhook-triggers/${id}`),
		queryKey: ['webhook-trigger', id],
		enabled: !!id
	})
}

export const useDeleteWebhookTriggers = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/webhook-triggers', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhook-triggers'] })
		}
	})
}

export const useWebhookReceipts = (triggerId: string | undefined, enabled: boolean) => {
	return useQuery<{ receipts: WebhookReceipt[]; count: number }>({
		queryFn: () =>
			sdk.client.fetch(`/admin/webhook-triggers/${triggerId}/receipts`, {
				query: { limit: 10, offset: 0 }
			}),
		queryKey: ['webhook-receipts', triggerId],
		enabled: enabled && !!triggerId
	})
}

export const useWebhookAction = (triggerId: string | undefined, actionId: string | undefined) => {
	return useQuery<{ action: WebhookAction }>({
		queryFn: () =>
			sdk.client.fetch(`/admin/webhook-triggers/${triggerId}/actions/${actionId}`),
		queryKey: ['webhook-action', actionId],
		enabled: !!triggerId && !!actionId
	})
}

export const useWebhookDeliveries = (triggerId: string | undefined, actionId: string | undefined) => {
	return useQuery<{ deliveries: WebhookDelivery[]; count: number }>({
		queryFn: () =>
			sdk.client.fetch(
				`/admin/webhook-triggers/${triggerId}/actions/${actionId}/deliveries`,
				{ query: { limit: 10, offset: 0 } }
			),
		queryKey: ['webhook-action-deliveries', actionId],
		enabled: !!triggerId && !!actionId
	})
}

export const useDeleteWebhookSecret = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			sdk.client.fetch(`/admin/webhook-secrets/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webhook-secrets'] })
		}
	})
}
