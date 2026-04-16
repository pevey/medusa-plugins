import { defineLink } from '@medusajs/framework/utils'
import InventoryModule from '@medusajs/medusa/inventory'
import TracingModule from '../modules/tracing'

export default defineLink(
	{
		linkable: InventoryModule.linkable.inventoryItem,
		field: 'id'
	},
	{
		...TracingModule.linkable.stockLot.id,
		primaryKey: 'inventory_item_id'
	},
	{
		readOnly: true
	}
)
