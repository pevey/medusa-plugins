import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminOrderResponse } from '@medusajs/framework/types'
import { sdk } from '../lib/sdk'
import {
	AdminComplaintActivityResponse,
	AdminComplaintTagsResponse,
	AdminComplaintsResponse,
	AdminComplaintResponse,
	AdminCustomerWithOrders
} from '../types'

type AdminCustomerWithOrdersResponse = { customer: AdminCustomerWithOrders }

export const useComplaintActivities = (complaintId: string) => {
	return useQuery<AdminComplaintActivityResponse>({
		queryFn: () => sdk.client.fetch(`/admin/complaints/${complaintId}/activities`),
		queryKey: ['complaint-activities', complaintId],
		enabled: !!complaintId
	})
}

export const useCustomerWithOrders = (customerId: string | undefined) => {
	return useQuery<AdminCustomerWithOrdersResponse>({
		queryFn: () =>
			sdk.client.fetch(`/admin/customers/${customerId}`, {
				query: { fields: 'orders.id,orders.display_id,orders.created_at' }
			}),
		queryKey: ['customer', customerId],
		enabled: !!customerId
	})
}

export const useOrder = (orderId: string | undefined) => {
	return useQuery<AdminOrderResponse>({
		queryFn: () =>
			sdk.client.fetch(`/admin/orders/${orderId}`, {
				query: { fields: 'id,customer_id,items.product_id,items.product_title' }
			}),
		queryKey: ['order', orderId],
		enabled: !!orderId
	})
}

export const useComplaintTags = () => {
	return useQuery<AdminComplaintTagsResponse>({
		queryFn: () =>
			sdk.client.fetch('/admin/complaint-tags', {
				query: { fields: 'id,value', limit: 100 }
			}),
		queryKey: ['complaint-tags']
	})
}

export const useCreateNote = (complaintId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { note: string }) =>
			sdk.client.fetch(`/admin/complaints/${complaintId}/notes`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['complaint-activities', complaintId] })
		}
	})
}

export const useUpdateNote = (complaintId: string, noteId: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { note: string }) =>
			sdk.client.fetch(`/admin/complaints/${complaintId}/notes/${noteId}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['complaint-activities', complaintId] })
		}
	})
}

export const useDeleteNote = (complaintId: string, noteId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/complaints/${complaintId}/notes/${noteId}`, {
				method: 'DELETE'
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['complaint-activities', complaintId] })
		}
	})
}

export const useCreateComplaint = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: {
			description: string
			customer_id: string
			order_id: string
			product_id: string
			tag_ids?: string[]
		}) =>
			sdk.client.fetch<AdminComplaintResponse>('/admin/complaints', {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['complaints'] })
		}
	})
}

export const useUpdateComplaint = (id: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			sdk.client.fetch<AdminComplaintResponse>(`/admin/complaints/${id}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['complaints'] })
			queryClient.invalidateQueries({ queryKey: ['complaint', id] })
			queryClient.invalidateQueries({ queryKey: ['complaint-activities', id] })
		}
	})
}

export const useComplaintsList = (params: Record<string, unknown>) => {
	return useQuery<AdminComplaintsResponse>({
		queryFn: () => sdk.client.fetch('/admin/complaints', { query: params }),
		queryKey: ['complaints', params]
	})
}

export const useComplaint = (id: string | undefined) => {
	return useQuery<AdminComplaintResponse>({
		queryFn: () => sdk.client.fetch(`/admin/complaints/${id}`),
		queryKey: ['complaint', id],
		enabled: !!id
	})
}

export const useDeleteComplaints = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/complaints', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['complaints'] })
		}
	})
}

export const useRecalculateComplaintStats = () => {
	return useMutation({
		mutationFn: () =>
			sdk.client.fetch('/admin/complaint-stats/recalculate', { method: 'POST' })
	})
}
