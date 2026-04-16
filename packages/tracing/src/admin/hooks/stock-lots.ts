import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { InventoryItemDTO, StockLocationDTO } from '@medusajs/types'
import { sdk } from '../lib/sdk'
import { AdminStockLotResponse, AdminStockLotsResponse, AdminSerialNumbersResponse } from '../types'

export const useStockLocations = () => {
	return useQuery<{ stock_locations: StockLocationDTO[] }>({
		queryFn: () => sdk.client.fetch('/admin/stock-locations'),
		queryKey: ['stock-locations']
	})
}

export const useInventoryItems = () => {
	return useQuery<{ inventory_items: InventoryItemDTO[] }>({
		queryFn: () => sdk.client.fetch('/admin/inventory-items'),
		queryKey: ['inventory-items']
	})
}

export const useStockLotSerialNumbers = (
	stockLotId: string,
	params: { limit: number; offset: number }
) => {
	return useQuery<AdminSerialNumbersResponse>({
		queryFn: () =>
			sdk.client.fetch(`/admin/stock-lots/${stockLotId}/serial-numbers`, {
				query: params
			}),
		queryKey: ['stock-lot', stockLotId, 'serial-numbers', params.limit, params.offset]
	})
}

export const useCreateStockLot = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: {
			inventory_item_id: string
			stock_location_id: string
			lot_number: string
			description?: string | null
			stocked_quantity: number
			enabled: boolean
		}) =>
			sdk.client.fetch<AdminStockLotResponse>('/admin/stock-lots', {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['stock-lots'] })
		}
	})
}

export const useUpdateStockLot = (id: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: {
			lot_number?: string
			description?: string | null
			stocked_quantity?: number
			enabled?: boolean
		}) =>
			sdk.client.fetch<AdminStockLotResponse>(`/admin/stock-lots/${id}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['stock-lot', id] })
			queryClient.invalidateQueries({ queryKey: ['stock-lots'] })
		}
	})
}

export const useStockLotsList = (params: Record<string, unknown>) => {
	return useQuery<AdminStockLotsResponse>({
		queryFn: () => sdk.client.fetch('/admin/stock-lots', { query: params }),
		queryKey: ['stock-lots', params]
	})
}

export const useStockLot = (id: string | undefined) => {
	return useQuery<AdminStockLotResponse>({
		queryFn: () =>
			sdk.client.fetch(`/admin/stock-lots/${id}`, {
				query: { fields: '*stock_location,*inventory_item' }
			}),
		queryKey: ['stock-lot', id],
		enabled: !!id
	})
}

export const useDeleteStockLots = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/stock-lots', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['stock-lots'] })
		}
	})
}

export const useEnableStockLots = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/stock-lots/enable', { method: 'POST', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['stock-lots'] })
		}
	})
}

export const useDisableStockLots = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/stock-lots/disable', { method: 'POST', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['stock-lots'] })
		}
	})
}
