import {
	defineMiddlewares,
	validateAndTransformBody,
	validateAndTransformQuery
} from '@medusajs/framework/http'
import {
	AdminGetStatistics,
	AdminRecalculateStatistics,
	AdminGetRecentOrders,
	AdminGetLowStock,
	AdminSaveStatisticsLayout
} from './validators'

export default defineMiddlewares([
	{
		matcher: '/admin/statistics',
		method: ['GET'],
		middlewares: [validateAndTransformQuery(AdminGetStatistics, { isList: false })]
	},
	{
		matcher: '/admin/statistics/recalculate',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminRecalculateStatistics)]
	},
	{
		matcher: '/admin/statistics/recent-orders',
		method: ['GET'],
		middlewares: [validateAndTransformQuery(AdminGetRecentOrders, { isList: false })]
	},
	{
		matcher: '/admin/statistics/low-stock',
		method: ['GET'],
		middlewares: [validateAndTransformQuery(AdminGetLowStock, { isList: false })]
	},
	{
		matcher: '/admin/statistics/layout',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminSaveStatisticsLayout)]
	}
])
