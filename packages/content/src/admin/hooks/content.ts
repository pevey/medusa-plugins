import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import {
	AdminContentCollectionsResponse,
	AdminContentCollectionResponse,
	AdminContentItemsResponse,
	AdminContentItemResponse
} from '../types'

// ── Content Collections ───────────────────────────────────────────────────────

export const useContentCollections = (params: Record<string, unknown> = {}) => {
	return useQuery<AdminContentCollectionsResponse>({
		queryFn: () => sdk.client.fetch('/admin/content', { query: params }),
		queryKey: ['content-collections', params]
	})
}

export const useContentCollection = (id: string | undefined) => {
	return useQuery<AdminContentCollectionResponse>({
		queryFn: () => sdk.client.fetch(`/admin/content/${id}`),
		queryKey: ['content-collection', id],
		enabled: !!id
	})
}

export const useCreateContentCollection = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			sdk.client.fetch<AdminContentCollectionResponse>('/admin/content', {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['content-collections'] })
		}
	})
}

export const useUpdateContentCollection = (id: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			sdk.client.fetch<AdminContentCollectionResponse>(`/admin/content/${id}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['content-collections'] })
			queryClient.invalidateQueries({ queryKey: ['content-collection', id] })
		}
	})
}

export const useDeleteContentCollections = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/content', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['content-collections'] })
		}
	})
}

// ── Content Items ──────────────────────────────────────────────────────────────

export const useContentItems = (collectionId: string | undefined, params: Record<string, unknown> = {}) => {
	return useQuery<AdminContentItemsResponse>({
		queryFn: () => sdk.client.fetch(`/admin/content/${collectionId}/items`, { query: params }),
		queryKey: ['content-items', collectionId, params],
		enabled: !!collectionId
	})
}

export const useContentItem = (collectionId: string | undefined, id: string | undefined) => {
	return useQuery<AdminContentItemResponse>({
		queryFn: () => sdk.client.fetch(`/admin/content/${collectionId}/items/${id}`),
		queryKey: ['content-item', collectionId, id],
		enabled: !!collectionId && !!id
	})
}

export const useCreateContentItem = (collectionId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			sdk.client.fetch<AdminContentItemResponse>(`/admin/content/${collectionId}/items`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['content-items'] })
		}
	})
}

export const useUpdateContentItem = (collectionId: string, id: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			sdk.client.fetch<AdminContentItemResponse>(`/admin/content/${collectionId}/items/${id}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['content-items'] })
			queryClient.invalidateQueries({ queryKey: ['content-item', collectionId, id] })
		}
	})
}

export const useDeleteContentItems = (collectionId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch(`/admin/content/${collectionId}/items`, { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['content-items'] })
		}
	})
}
