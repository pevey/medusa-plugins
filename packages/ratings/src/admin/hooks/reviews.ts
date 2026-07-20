import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { AdminReviewsResponse, AdminReviewResponse } from '../types'

export const useReviewsList = (params: Record<string, unknown>) => {
	return useQuery<AdminReviewsResponse>({
		queryFn: () => sdk.client.fetch('/admin/reviews', { query: params }),
		queryKey: ['reviews', params]
	})
}

export const useReview = (id: string | undefined) => {
	return useQuery<AdminReviewResponse>({
		queryFn: () => sdk.client.fetch(`/admin/reviews/${id}`),
		queryKey: ['review', id],
		enabled: !!id
	})
}

export const useUpdateReview = (id: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch<AdminReviewResponse>(`/admin/reviews/${id}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reviews'] })
			queryClient.invalidateQueries({ queryKey: ['review', id] })
		}
	})
}

export const useDeleteReview = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			sdk.client.fetch(`/admin/reviews/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reviews'] })
		}
	})
}

export const useDeleteReviews = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/reviews', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reviews'] })
		}
	})
}

export const useApproveReviews = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/reviews/approve', { method: 'POST', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reviews'] })
		}
	})
}

export const useRejectReviews = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/reviews/reject', { method: 'POST', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reviews'] })
		}
	})
}
