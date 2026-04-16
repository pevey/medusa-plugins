import { defineLink } from '@medusajs/framework/utils'
import InventoryModule from '@medusajs/medusa/inventory'
import TracingModule from '../modules/tracing'

export default defineLink(
	{
		linkable: TracingModule.linkable.stockLot,
		field: 'inventory_item_id'
	},
	InventoryModule.linkable.inventoryItem,
	{
		readOnly: true
	}
)
