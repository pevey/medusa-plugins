import { defineLink } from '@medusajs/framework/utils'
import UserModule from '@medusajs/medusa/user'
import ContentModule from '../modules/content'

export default defineLink(
	{
		linkable: ContentModule.linkable.contentCreatorActivity,
		field: 'user_id'
	},
	UserModule.linkable.user,
	{
		readOnly: true
	}
)
