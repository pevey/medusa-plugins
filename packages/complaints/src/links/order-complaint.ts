import { defineLink } from '@medusajs/framework/utils'
import OrderModule from '@medusajs/medusa/order'
import ComplaintModule from '../modules/complaint'

export default defineLink(
	{
		linkable: OrderModule.linkable.order,
		field: 'id'
	},
	{
		...ComplaintModule.linkable.complaint.id,
		primaryKey: 'order_id'
	},
	{
		readOnly: true
	}
)
