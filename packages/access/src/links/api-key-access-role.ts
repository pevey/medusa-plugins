import { defineLink } from '@medusajs/framework/utils'
import ApiKeyModule from '@medusajs/medusa/api-key'
import AccessModule from '../modules/access'

export default defineLink(
	{
		linkable: ApiKeyModule.linkable.apiKey,
		isList: true
	},
	{
		linkable: AccessModule.linkable.accessRole,
		isList: true,
		filterable: ['id', 'name']
	}
)
