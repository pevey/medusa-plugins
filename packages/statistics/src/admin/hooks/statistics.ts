import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import type {
	AdminStatisticsResponse,
	AdminStatisticsRecentOrdersResponse,
	AdminStatisticsLowStockResponse,
	AdminStatisticsLayoutResponse,
	AdminStatisticsLayoutItem
} from '../types'

export const useStatistics = (period: string) => {
	return useQuery<AdminStatisticsResponse>({
		queryFn: () => sdk.client.fetch('/admin/statistics', { query: { period } }),
		queryKey: ['statistics', period]
	})
}

export const useRecentOrders = (limit = 10) => {
	return useQuery<AdminStatisticsRecentOrdersResponse>({
		queryFn: () => sdk.client.fetch('/admin/statistics/recent-orders', { query: { limit } }),
		queryKey: ['statistics-recent-orders', limit]
	})
}

export const useLowStock = (threshold = 10) => {
	return useQuery<AdminStatisticsLowStockResponse>({
		queryFn: () => sdk.client.fetch('/admin/statistics/low-stock', { query: { threshold } }),
		queryKey: ['statistics-low-stock', threshold]
	})
}

export const useStatisticsLayout = () => {
	return useQuery<AdminStatisticsLayoutResponse>({
		queryFn: () => sdk.client.fetch('/admin/statistics/layout'),
		queryKey: ['statistics-layout']
	})
}

export const useSaveStatisticsLayout = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (layout: AdminStatisticsLayoutItem[]) => sdk.client.fetch('/admin/statistics/layout', { method: 'POST', body: { layout } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['statistics-layout'] })
		}
	})
}

export const useRecalculateStatistics = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () => sdk.client.fetch('/admin/statistics/recalculate', { method: 'POST', body: {} }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['statistics'] })
		}
	})
}
