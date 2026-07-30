import { defineLink } from '@medusajs/framework/utils'
import UserModule from '@medusajs/medusa/user'
import AccessModule from '../modules/access'

export default defineLink(
	{
		linkable: UserModule.linkable.user,
		isList: true
	},
	{
		linkable: AccessModule.linkable.accessRole,
		isList: true,
		filterable: ['id', 'name']
	}
)
