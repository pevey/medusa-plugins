import {
	defineMiddlewares,
	validateAndTransformBody,
	validateAndTransformQuery,
	MedusaRequest,
	MedusaResponse
} from '@medusajs/framework/http'
import type { NextFunction } from 'express'
import {
	AdminGetStatistics,
	AdminRecalculateStatistics,
	AdminGetRecentOrders,
	AdminGetLowStock,
	AdminSaveStatisticsLayout
} from './validators'

function exposeMcpHeaders(
	req: MedusaRequest,
	res: MedusaResponse,
	next: NextFunction
) {
	res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')
	res.setHeader(
		'Access-Control-Allow-Headers',
		[res.getHeader('Access-Control-Allow-Headers') ?? '', 'mcp-session-id']
			.filter(Boolean)
			.join(', ')
	)
	next()
}

export default defineMiddlewares([
	{
		matcher: '/admin/mcp',
		method: ['GET', 'POST', 'DELETE'],
		middlewares: [exposeMcpHeaders]
	},
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
