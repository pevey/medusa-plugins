import { defineLink } from '@medusajs/framework/utils'
import UserModule from '@medusajs/medusa/user'
import ContentModule from '../modules/content'

export default defineLink(
	{
		linkable: UserModule.linkable.user,
		field: 'id'
	},
	{
		...ContentModule.linkable.contentCreatorActivity.id,
		primaryKey: 'user_id'
	},
	{
		readOnly: true
	}
)
