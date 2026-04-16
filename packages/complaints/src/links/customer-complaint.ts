import { defineLink } from '@medusajs/framework/utils'
import CustomerModule from '@medusajs/medusa/customer'
import ComplaintModule from '../modules/complaint'

export default defineLink(
	{
		linkable: CustomerModule.linkable.customer,
		field: 'id'
	},
	{
		...ComplaintModule.linkable.complaint.id,
		primaryKey: 'customer_id'
	},
	{
		readOnly: true
	}
)
