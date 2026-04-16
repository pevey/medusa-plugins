import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { AdminComplaintTagResponse, AdminComplaintTagsResponse } from '../types'

export const useCreateComplaintTag = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { value: string }) =>
			sdk.client.fetch<AdminComplaintTagResponse>('/admin/complaint-tags', {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['complaint-tags'] })
		}
	})
}

export const useUpdateComplaintTag = (id: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { value: string }) =>
			sdk.client.fetch<AdminComplaintTagResponse>(`/admin/complaint-tags/${id}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['complaint-tag', id] })
			queryClient.invalidateQueries({ queryKey: ['complaint-tags'] })
		}
	})
}

export const useComplaintTagsList = (params: { limit: number; offset: number; q?: string }) => {
	return useQuery<AdminComplaintTagsResponse>({
		queryFn: () => sdk.client.fetch('/admin/complaint-tags', { query: params }),
		queryKey: ['complaint-tags', params]
	})
}

export const useComplaintTag = (id: string | undefined) => {
	return useQuery<AdminComplaintTagResponse>({
		queryFn: () => sdk.client.fetch(`/admin/complaint-tags/${id}`),
		queryKey: ['complaint-tag', id],
		enabled: !!id
	})
}

export const useDeleteComplaintTags = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/complaint-tags', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['complaint-tags'] })
		}
	})
}
