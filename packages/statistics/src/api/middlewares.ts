import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import { AdminGetStatistics, AdminGetRecentOrders, AdminGetLowStock, AdminSaveStatisticsLayout } from './validators'

export default defineMiddlewares([
	{
		matcher: '/admin/statistics',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetStatistics, {
				// The route returns each `StatisticsDaily` row as-is (see `src/admin/types.ts`'s
				// `AdminStatisticsDaily` comment) -- every column the model declares, unstripped,
				// plus the `id`/`created_at`/`updated_at`/`deleted_at` columns `model.define()`
				// adds automatically. `defaults` documents that real wire shape; the handler
				// doesn't consult `req.queryConfig` (it hand-builds `{ statistics, totals, period }`),
				// so this doesn't drive field selection, but it is now an accurate contract for the
				// admin test harness to check UI field reads against.
				defaults: [
					'id',
					'date',
					'revenue_total',
					'order_count',
					'average_order_value',
					'new_customer_count',
					'returning_customer_count',
					'pending_fulfillment_count',
					'low_stock_count',
					'top_products',
					'metadata',
					'created_at',
					'updated_at',
					'deleted_at'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/statistics/recent-orders',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetRecentOrders, {
				// Mirrors the exact `fields` array the handler passes to `query.graph({ entity: 'order', ... })`
				// (`recent-orders/route.ts`), plus `customer_id`/`customer.id` -- Medusa's Query module
				// auto-includes a relation's `id` and the owning side's FK whenever a nested relation
				// is requested, even though neither is in the explicit `fields` list (see
				// `AdminStatisticsRecentOrder` in `src/admin/types.ts`). The handler builds its own
				// `fields` array rather than reading `req.queryConfig`, so this doesn't drive selection,
				// but documents the real wire shape for the admin test harness.
				defaults: ['id', 'display_id', 'status', 'email', 'total', 'created_at', 'customer_id', 'customer.id', 'customer.first_name', 'customer.last_name'],
				isList: false
			})
		]
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
