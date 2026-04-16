import { defineLink } from '@medusajs/framework/utils'
import CustomerModule from '@medusajs/medusa/customer'
import ComplaintModule from '../modules/complaint'

export default defineLink(
	{
		linkable: ComplaintModule.linkable.complaint,
		field: 'customer_id'
	},
	CustomerModule.linkable.customer,
	{
		readOnly: true
	}
)
