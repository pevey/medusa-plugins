import { defineLink } from '@medusajs/framework/utils'
import StockLocationModule from '@medusajs/medusa/stock-location'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: StockLocationModule.linkable.stockLocation,
		field: 'id'
	},
	{
		...VeeqoModule.linkable.veeqoWarehouse.id,
		primaryKey: 'stock_location_id'
	},
	{
		readOnly: true
	}
)
