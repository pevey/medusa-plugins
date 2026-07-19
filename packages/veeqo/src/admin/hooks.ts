import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from './lib/sdk'
import {
	AdminSalesChannelsWithVeeqoListResponse,
	AdminStockLocationsWithVeeqoListResponse,
	AdminShippingOptionsWithVeeqoListResponse,
	AdminProductWithVeeqoListResponse,
	AdminProductVariantsWithVeeqoListResponse
} from './types'

export const useVeeqoSalesChannels = (params: { limit: number; offset: number }) =>
	useQuery<AdminSalesChannelsWithVeeqoListResponse>({
		queryFn: () =>
			sdk.client.fetch('/admin/sales-channels', {
				query: { fields: 'id,name,description,veeqo_channel.veeqo_channel_id', ...params }
			}),
		queryKey: ['sales_channels', params.limit, params.offset]
	})

export const useSyncVeeqoSalesChannels = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/veeqo/sales-channels/sync', {
				method: 'POST',
				body: { sales_channel_ids: ids }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sales_channels'] })
		}
	})
}

export const useVeeqoStockLocations = (params: { limit: number; offset: number }) =>
	useQuery<AdminStockLocationsWithVeeqoListResponse>({
		queryFn: () =>
			sdk.client.fetch('/admin/stock-locations', {
				query: {
					fields:
						'id,name,address.city,address.country_code,veeqo_warehouse.veeqo_warehouse_id',
					...params
				}
			}),
		queryKey: ['stock_locations', params.limit, params.offset]
	})

export const useSyncVeeqoStockLocations = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/veeqo/stock-locations/sync', {
				method: 'POST',
				body: { stock_location_ids: ids }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['stock_locations'] })
		}
	})
}

export const useVeeqoShippingOptions = (params: { limit: number; offset: number }) =>
	useQuery<AdminShippingOptionsWithVeeqoListResponse>({
		queryFn: () =>
			sdk.client.fetch('/admin/shipping-options', {
				query: {
					fields: 'id,name,type,veeqo_delivery_method.veeqo_delivery_method_id',
					...params
				}
			}),
		queryKey: ['shipping-options', params.limit, params.offset]
	})

export const useSyncVeeqoShippingOptions = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/veeqo/shipping-options/sync', {
				method: 'POST',
				body: { shipping_option_ids: ids }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['shipping-options'] })
		}
	})
}

export const useVeeqoProducts = (params: { limit: number; offset: number }) =>
	useQuery<AdminProductWithVeeqoListResponse>({
		queryFn: () =>
			sdk.client.fetch('/admin/products', {
				query: { fields: 'id,title,status,veeqo_product.veeqo_product_id', ...params }
			}),
		queryKey: ['products', params.limit, params.offset]
	})

export const useVeeqoProductVariants = (params: { limit: number; offset: number }) =>
	useQuery<AdminProductVariantsWithVeeqoListResponse>({
		queryFn: () =>
			sdk.client.fetch('/admin/product-variants', {
				query: {
					fields: 'id,title,sku,product_id,product.title,veeqo_sellable.veeqo_sellable_id',
					...params
				}
			}),
		queryKey: ['product-variants', params.limit, params.offset]
	})

export const useSyncVeeqoProducts = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/veeqo/products/sync', {
				method: 'POST',
				body: { product_ids: ids }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] })
			queryClient.invalidateQueries({ queryKey: ['veeqo-products'] })
			queryClient.invalidateQueries({ queryKey: ['product-variants'] })
		}
	})
}
