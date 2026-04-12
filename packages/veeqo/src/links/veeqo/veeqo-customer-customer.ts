import { defineLink } from '@medusajs/framework/utils'
import CustomerModule from '@medusajs/medusa/customer'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: VeeqoModule.linkable.veeqoCustomer,
		field: 'customer_id'
	},
	CustomerModule.linkable.customer,
	{
		readOnly: true
	}
)
