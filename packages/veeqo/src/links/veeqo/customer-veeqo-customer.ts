import { defineLink } from '@medusajs/framework/utils'
import CustomerModule from '@medusajs/medusa/customer'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: CustomerModule.linkable.customer,
		field: 'id'
	},
	{
		...VeeqoModule.linkable.veeqoCustomer.id,
		primaryKey: 'customer_id'
	},
	{
		readOnly: true
	}
)
