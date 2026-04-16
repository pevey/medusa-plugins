import { model } from '@medusajs/framework/utils'

export const StatisticsDaily = model.define('statistics_daily', {
	id: model.id().primaryKey(),
	date: model.dateTime(),
	revenue_total: model.float().default(0),
	order_count: model.number().default(0),
	average_order_value: model.float().default(0),
	new_customer_count: model.number().default(0),
	returning_customer_count: model.number().default(0),
	pending_fulfillment_count: model.number().default(0),
	low_stock_count: model.number().default(0),
	top_products: model.json().nullable(),
	metadata: model.json().nullable()
})
