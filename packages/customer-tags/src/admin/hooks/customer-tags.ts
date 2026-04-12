import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { AdminCustomerTagResponse, AdminCustomerTagsResponse } from '../types'

export const useCreateCustomerTag = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { value: string }) =>
			sdk.client.fetch<AdminCustomerTagResponse>('/admin/customer-tags', {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customer-tags'] })
		}
	})
}

export const useUpdateCustomerTag = (id: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { value: string }) =>
			sdk.client.fetch<AdminCustomerTagResponse>(`/admin/customer-tags/${id}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customer-tag', id] })
			queryClient.invalidateQueries({ queryKey: ['customer-tags'] })
		}
	})
}

export const useCustomerTagsList = (params: { limit: number; offset: number; q?: string }) => {
	return useQuery<AdminCustomerTagsResponse>({
		queryFn: () => sdk.client.fetch('/admin/customer-tags', { query: params }),
		queryKey: ['customer-tags', params]
	})
}

export const useCustomerTag = (id: string | undefined) => {
	return useQuery<AdminCustomerTagResponse>({
		queryFn: () => sdk.client.fetch(`/admin/customer-tags/${id}`),
		queryKey: ['customer-tag', id],
		enabled: !!id
	})
}

export const useDeleteCustomerTags = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/customer-tags', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customer-tags'] })
		}
	})
}
