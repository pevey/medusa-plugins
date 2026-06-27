import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminOrderResponse } from '@medusajs/framework/types'
import { sdk } from '../lib/sdk'
import {
	AdminComplaintActivityResponse,
	AdminComplaintDocument,
	AdminComplaintDocumentDownloadResponse,
	AdminComplaintDocumentResponse,
	AdminComplaintDocumentsResponse,
	AdminComplaintTagsResponse,
	AdminComplaintsResponse,
	AdminComplaintResponse,
	AdminCustomerWithOrders
} from '../types'

export type UploadProgress = {
	loaded: number
	total: number
	percent: number
}

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
			order_id?: string
			product_id?: string
			actionable?: boolean
			reportable?: boolean
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

export const useGenerateComplaintsPdfExport = () => {
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch<{ transaction_id: string }>('/admin/complaints/pdf-export', {
				method: 'POST',
				body: { ids }
			})
	})
}

export const useRecalculateComplaintStats = () => {
	return useMutation({
		mutationFn: () =>
			sdk.client.fetch('/admin/complaint-stats/recalculate', { method: 'POST' })
	})
}

export const useComplaintDocuments = (complaintId: string | undefined) => {
	return useQuery<AdminComplaintDocumentsResponse>({
		queryFn: () => sdk.client.fetch(`/admin/complaints/${complaintId}/documents`),
		queryKey: ['complaint-documents', complaintId],
		enabled: !!complaintId
	})
}

/**
 * Uploads a single file with per-file progress reporting via XMLHttpRequest.
 *
 * The Medusa SDK uses fetch(), which does not expose upload progress events.
 * For the documents drag-and-drop UI we need a progress bar per file, so this
 * hook bypasses the SDK and uses XHR directly. Session cookie auth still
 * works because withCredentials is true.
 *
 * The complaintId is passed at call time (not at hook construction) so the
 * create-complaint modal can stage files before the complaint exists, then
 * upload them once the new complaint id is known.
 */
export const useUploadComplaintDocument = () => {
	const queryClient = useQueryClient()

	return useCallback(
		(complaintId: string, file: File, onProgress?: (p: UploadProgress) => void) =>
			new Promise<AdminComplaintDocument>((resolve, reject) => {
				const formData = new FormData()
				formData.append('file', file)

				const xhr = new XMLHttpRequest()
				xhr.open('POST', `/admin/complaints/${complaintId}/documents`)
				xhr.withCredentials = true

				xhr.upload.addEventListener('progress', (e) => {
					if (e.lengthComputable && onProgress) {
						onProgress({
							loaded: e.loaded,
							total: e.total,
							percent: Math.round((e.loaded / e.total) * 100)
						})
					}
				})

				xhr.addEventListener('load', () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						try {
							const json: AdminComplaintDocumentResponse = JSON.parse(xhr.responseText)
							queryClient.invalidateQueries({
								queryKey: ['complaint-documents', complaintId]
							})
							queryClient.invalidateQueries({ queryKey: ['complaint', complaintId] })
							resolve(json.document)
						} catch (err) {
							reject(err)
						}
					} else {
						let message = `Upload failed (${xhr.status})`
						try {
							const json = JSON.parse(xhr.responseText)
							if (json?.message) message = json.message
						} catch {
							/* keep default */
						}
						reject(new Error(message))
					}
				})

				xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
				xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

				xhr.send(formData)
			}),
		[queryClient]
	)
}

export const useDeleteComplaintDocument = (complaintId: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (docId: string) =>
			sdk.client.fetch(`/admin/complaints/${complaintId}/documents/${docId}`, {
				method: 'DELETE'
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['complaint-documents', complaintId] })
			queryClient.invalidateQueries({ queryKey: ['complaint', complaintId] })
		}
	})
}

export const useDownloadComplaintDocument = () => {
	return useMutation({
		mutationFn: async ({
			complaintId,
			docId
		}: {
			complaintId: string
			docId: string
		}) => {
			const res = await sdk.client.fetch<AdminComplaintDocumentDownloadResponse>(
				`/admin/complaints/${complaintId}/documents/${docId}/download`
			)
			window.open(res.url, '_blank', 'noopener,noreferrer')
			return res
		}
	})
}
