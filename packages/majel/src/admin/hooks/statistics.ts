import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'

type StatisticsResponse = {
	statistics: any[]
	totals: {
		revenue_total: number
		order_count: number
		average_order_value: number
		new_customer_count: number
		returning_customer_count: number
		pending_fulfillment_count: number
		low_stock_count: number
	}
	period: string
}

type RecentOrdersResponse = {
	orders: any[]
}

type LowStockWarning = {
	inventory_item_id: string
	sku: string | null
	title: string | null
	location_name: string
	location_id: string
	reason: 'no_lots' | 'low_stock'
	available_quantity: number
}

type LowStockResponse = {
	warnings: LowStockWarning[]
}

type LayoutItem = {
	widget_id: string
	x: number
	y: number
	w: number
	h: number
	visible: boolean
}

type LayoutResponse = {
	layout: LayoutItem[] | null
}

export const useStatistics = (period: string) => {
	return useQuery<StatisticsResponse>({
		queryFn: () => sdk.client.fetch('/admin/statistics', { query: { period } }),
		queryKey: ['statistics', period]
	})
}

export const useRecentOrders = (limit = 10) => {
	return useQuery<RecentOrdersResponse>({
		queryFn: () => sdk.client.fetch('/admin/statistics/recent-orders', { query: { limit } }),
		queryKey: ['statistics-recent-orders', limit]
	})
}

export const useLowStock = (threshold = 10) => {
	return useQuery<LowStockResponse>({
		queryFn: () => sdk.client.fetch('/admin/statistics/low-stock', { query: { threshold } }),
		queryKey: ['statistics-low-stock', threshold]
	})
}

export const useStatisticsLayout = () => {
	return useQuery<LayoutResponse>({
		queryFn: () => sdk.client.fetch('/admin/statistics/layout'),
		queryKey: ['statistics-layout']
	})
}

export const useSaveStatisticsLayout = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (layout: LayoutItem[]) =>
			sdk.client.fetch('/admin/statistics/layout', { method: 'POST', body: { layout } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['statistics-layout'] })
		}
	})
}

export const useRecalculateStatistics = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () =>
			sdk.client.fetch('/admin/statistics/recalculate', { method: 'POST', body: {} }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['statistics'] })
		}
	})
}
