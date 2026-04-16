import { defineLink } from '@medusajs/framework/utils'
import OrderModule from '@medusajs/medusa/order'
import TracingModule from '../modules/tracing'

export default defineLink(
	{
		linkable: OrderModule.linkable.order,
		field: 'id'
	},
	{
		...TracingModule.linkable.serialNumber.id,
		primaryKey: 'order_id'
	},
	{
		readOnly: true
	}
)
