import { defineLink } from '@medusajs/framework/utils'
import CustomerModule from '@medusajs/medusa/customer'
import AccessModule from '../modules/access'

export default defineLink(
	{
		linkable: CustomerModule.linkable.customer,
		isList: true
	},
	{
		linkable: AccessModule.linkable.accessRole,
		isList: true,
		filterable: ['id', 'name']
	}
)
