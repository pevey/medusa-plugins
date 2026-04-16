import { defineLink } from '@medusajs/framework/utils'
import StockLocationModule from '@medusajs/medusa/stock-location'
import TracingModule from '../modules/tracing'

export default defineLink(
	{
		linkable: TracingModule.linkable.stockLot,
		field: 'stock_location_id'
	},
	StockLocationModule.linkable.stockLocation,
	{
		readOnly: true
	}
)
