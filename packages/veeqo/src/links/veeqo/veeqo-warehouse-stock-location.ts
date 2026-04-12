import { defineLink } from '@medusajs/framework/utils'
import StockLocationModule from '@medusajs/medusa/stock-location'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: VeeqoModule.linkable.veeqoWarehouse,
		field: 'stock_location_id'
	},
	StockLocationModule.linkable.stockLocation,
	{
		readOnly: true
	}
)
