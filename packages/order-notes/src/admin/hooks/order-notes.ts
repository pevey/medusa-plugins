import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { AdminOrderNotesResponse } from '../types'

export const useOrderNotes = (orderId: string) => {
	return useQuery<AdminOrderNotesResponse>({
		queryFn: () =>
			sdk.client.fetch('/admin/order-notes', {
				query: { order_id: orderId, limit: 50 }
			}),
		queryKey: ['order-notes', orderId],
		enabled: !!orderId
	})
}

export const useCreateOrderNote = (orderId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (body: { order_id: string; note: string; sent: boolean }) =>
			sdk.client.fetch('/admin/order-notes', { method: 'POST', body }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['order-notes', orderId] })
			queryClient.invalidateQueries({ queryKey: ['orders'] })
			queryClient.invalidateQueries({ queryKey: ['order', orderId] })
		}
	})
}

export const useDeleteOrderNote = (orderId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			sdk.client.fetch(`/admin/order-notes/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['order-notes', orderId] })
		}
	})
}
