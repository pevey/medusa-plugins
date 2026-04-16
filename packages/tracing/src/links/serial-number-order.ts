import { defineLink } from '@medusajs/framework/utils'
import OrderModule from '@medusajs/medusa/order'
import TracingModule from '../modules/tracing'

export default defineLink(
	{
		linkable: TracingModule.linkable.serialNumber,
		field: 'order_id'
	},
	OrderModule.linkable.order,
	{
		readOnly: true
	}
)
