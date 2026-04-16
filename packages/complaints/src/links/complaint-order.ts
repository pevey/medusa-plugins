import { defineLink } from '@medusajs/framework/utils'
import OrderModule from '@medusajs/medusa/order'
import ComplaintModule from '../modules/complaint'

export default defineLink(
	{
		linkable: ComplaintModule.linkable.complaint,
		field: 'order_id'
	},
	OrderModule.linkable.order,
	{
		readOnly: true
	}
)
