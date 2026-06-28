import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { AdminAffiliate, AdminAffiliateStatsResponse } from '../types'

const KEY = ['affiliates'] as const

export const useAffiliatesList = (params: Record<string, unknown> = {}) =>
	useQuery({
		queryKey: [...KEY, 'list', params],
		queryFn: () =>
			sdk.client.fetch<{
				affiliates: AdminAffiliate[]
				count: number
				limit: number
				offset: number
			}>('/admin/affiliates', { method: 'GET', query: params })
	})

export const useAffiliate = (id: string) =>
	useQuery({
		queryKey: [...KEY, 'detail', id],
		queryFn: () =>
			sdk.client.fetch<{ affiliate: AdminAffiliate }>(`/admin/affiliates/${id}`, {
				method: 'GET'
			})
	})

const invalidate = (qc: ReturnType<typeof useQueryClient>) =>
	qc.invalidateQueries({ queryKey: KEY })

export const useCreateAffiliate = () => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch<{ affiliate: { affiliate_id: string } }>('/admin/affiliates', {
				method: 'POST',
				body: data
			}),
		onSuccess: () => invalidate(qc)
	})
}

export const useUpdateAffiliate = (id: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/affiliates/${id}`, { method: 'POST', body: data }),
		onSuccess: () => invalidate(qc)
	})
}

export const useDeleteAffiliates = () => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/affiliates', { method: 'DELETE', body: { ids } }),
		onSuccess: () => invalidate(qc)
	})
}

export const useAddAffiliateAddress = (id: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/affiliates/${id}/addresses`, { method: 'POST', body: data }),
		onSuccess: () => invalidate(qc)
	})
}
export const useUpdateAffiliateAddress = (id: string, addressId: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/affiliates/${id}/addresses/${addressId}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => invalidate(qc)
	})
}
export const useDeleteAffiliateAddress = (id: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (addressId: string) =>
			sdk.client.fetch(`/admin/affiliates/${id}/addresses/${addressId}`, {
				method: 'DELETE'
			}),
		onSuccess: () => invalidate(qc)
	})
}
export const useSetPrimaryAffiliateAddress = (id: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (addressId: string) =>
			sdk.client.fetch(`/admin/affiliates/${id}`, {
				method: 'POST',
				body: { primary_address_id: addressId }
			}),
		onSuccess: () => invalidate(qc)
	})
}

export const useAddAffiliatePromotion = (id: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/affiliates/${id}/promotions`, { method: 'POST', body: data }),
		onSuccess: () => invalidate(qc)
	})
}
export const useUpdateAffiliatePromotion = (id: string, promotionId: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/affiliates/${id}/promotions/${promotionId}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => invalidate(qc)
	})
}
export const useRetireAffiliatePromotion = (id: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (promotionId: string) =>
			sdk.client.fetch(`/admin/affiliates/${id}/promotions/${promotionId}/retire`, {
				method: 'POST'
			}),
		onSuccess: () => invalidate(qc)
	})
}
export const useReactivateAffiliatePromotion = (id: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (promotionId: string) =>
			sdk.client.fetch(`/admin/affiliates/${id}/promotions/${promotionId}/reactivate`, {
				method: 'POST'
			}),
		onSuccess: () => invalidate(qc)
	})
}
export const useDeleteAffiliatePromotion = (id: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (promotionId: string) =>
			sdk.client.fetch(`/admin/affiliates/${id}/promotions/${promotionId}`, {
				method: 'DELETE'
			}),
		onSuccess: () => invalidate(qc)
	})
}

export const useAffiliateStats = (
	id: string,
	params: { basis?: string; window?: string; promotion_id?: string }
) =>
	useQuery({
		queryKey: [...KEY, 'stats', id, params],
		queryFn: () =>
			sdk.client.fetch<AdminAffiliateStatsResponse>(`/admin/affiliates/${id}/stats`, {
				method: 'GET',
				query: params
			})
	})

export const useRecalculateAffiliateAttributions = (id: string) => {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: () =>
			sdk.client.fetch(`/admin/affiliates/${id}/attributions/recalculate`, {
				method: 'POST'
			}),
		onSuccess: () => invalidate(qc)
	})
}
