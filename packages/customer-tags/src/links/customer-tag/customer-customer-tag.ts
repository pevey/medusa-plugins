import { defineLink } from '@medusajs/framework/utils'
import CustomerModule from '@medusajs/medusa/customer'
import CustomerTagModule from '../../modules/customer-tag'

export default defineLink(
	{
		linkable: CustomerModule.linkable.customer,
		isList: true
	},
	{
		linkable: CustomerTagModule.linkable.customerTag,
		isList: true,
		filterable: ['id', 'value']
	}
)
