import { model } from '@medusajs/framework/utils'

export const VeeqoWarehouse = model.define('veeqo_warehouse', {
	id: model.id().primaryKey(),
	stock_location_id: model.text().unique(),
	veeqo_warehouse_id: model.number().unique()
})
