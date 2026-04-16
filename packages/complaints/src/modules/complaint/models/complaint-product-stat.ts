import { model } from '@medusajs/framework/utils'

// change this to keep each calculation for comparison over time instead of overwriting the same record
export const ComplaintProductStat = model.define('complaint_product_stat', {
	id: model.id().primaryKey(),
	product_id: model.text(),
	total_orders: model.number().default(0),
	total_complaints: model.number().default(0),
	complaint_rate: model.float().default(0),
	last_calculated_at: model.dateTime().nullable(),
	metadata: model.json().nullable()
})
