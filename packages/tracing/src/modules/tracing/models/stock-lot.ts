import { model } from '@medusajs/framework/utils'
import { SerialNumber } from './serial-number'

export const StockLot = model.define('stock_lot', {
	id: model.id().primaryKey(),
	inventory_item_id: model.text(), // references InventoryItem
	stock_location_id: model.text(), // references StockLocation
	lot_number: model.text(),
	description: model.text().nullable(),
	enabled: model.boolean().default(true),
	initial_quantity: model.number(),
	stocked_quantity: model.number(),
	serial_numbers: model.hasMany(() => SerialNumber, {
		mappedBy: 'stock_lot'
	}),
	metadata: model.json().nullable()
})
