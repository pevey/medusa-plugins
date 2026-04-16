import { z } from '@medusajs/framework/zod'

export const AdminGetStatistics = z.object({
	period: z.enum(['today', 'week', 'month']).optional().default('week'),
	start_date: z.string().optional(),
	end_date: z.string().optional()
})
export type AdminGetStatisticsType = z.infer<typeof AdminGetStatistics>

export const AdminRecalculateStatistics = z.object({
	date: z.string().optional()
})
export type AdminRecalculateStatisticsType = z.infer<typeof AdminRecalculateStatistics>

export const AdminGetRecentOrders = z.object({
	limit: z.coerce.number().int().min(1).max(50).optional().default(10)
})
export type AdminGetRecentOrdersType = z.infer<typeof AdminGetRecentOrders>

export const AdminGetLowStock = z.object({
	threshold: z.coerce.number().int().min(0).optional().default(10),
	limit: z.coerce.number().int().min(1).max(100).optional().default(20)
})
export type AdminGetLowStockType = z.infer<typeof AdminGetLowStock>

export const AdminSaveStatisticsLayout = z.object({
	layout: z.array(z.object({
		widget_id: z.string(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
		visible: z.boolean().optional().default(true)
	}))
})
export type AdminSaveStatisticsLayoutType = z.infer<typeof AdminSaveStatisticsLayout>
