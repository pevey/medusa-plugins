import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { AdminInvalidationReasonResponse, AdminInvalidationReasonsResponse } from '../types'

export const useCreateInvalidationReason = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { value: string }) =>
			sdk.client.fetch<AdminInvalidationReasonResponse>('/admin/invalidation-reasons', {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['invalidation-reasons'] })
		}
	})
}

export const useUpdateInvalidationReason = (id: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { value: string }) =>
			sdk.client.fetch<AdminInvalidationReasonResponse>(`/admin/invalidation-reasons/${id}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['invalidation-reason', id] })
			queryClient.invalidateQueries({ queryKey: ['invalidation-reasons'] })
		}
	})
}

export const useInvalidationReasonsList = (params: { limit: number; offset: number; q?: string }) => {
	return useQuery<AdminInvalidationReasonsResponse>({
		queryFn: () => sdk.client.fetch('/admin/invalidation-reasons', { query: params }),
		queryKey: ['invalidation-reasons', params]
	})
}

export const useInvalidationReason = (id: string | undefined) => {
	return useQuery<AdminInvalidationReasonResponse>({
		queryFn: () => sdk.client.fetch(`/admin/invalidation-reasons/${id}`),
		queryKey: ['invalidation-reason', id],
		enabled: !!id
	})
}

export const useDeleteInvalidationReasons = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/invalidation-reasons', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['invalidation-reasons'] })
		}
	})
}
