import { model } from '@medusajs/framework/utils'
import { StockLot } from './stock-lot'
import { InvalidationReason } from './invalidation-reason'

export const SerialNumber = model.define('serial_number', {
	id: model.id().primaryKey(),
	order_id: model.text(),
	value: model.text(),
	invalidated: model.boolean().default(false),
	invalidation_reason: model
		.belongsTo(() => InvalidationReason, {
			mappedBy: 'serial_numbers'
		})
		.nullable(),
	stock_lot: model.belongsTo(() => StockLot, {
		mappedBy: 'serial_numbers'
	}),
	// stock_lot_id is automatially added by Medusa
	metadata: model.json().nullable()
})
