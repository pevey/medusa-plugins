import { defineLink } from '@medusajs/framework/utils'
import StockLocationModule from '@medusajs/medusa/stock-location'
import TracingModule from '../modules/tracing'

export default defineLink(
	{
		linkable: StockLocationModule.linkable.stockLocation,
		field: 'id'
	},
	{
		...TracingModule.linkable.stockLot.id,
		primaryKey: 'stock_location_id'
	},
	{
		readOnly: true
	}
)
