import { defineLink } from '@medusajs/framework/utils'
import UserModule from '@medusajs/medusa/user'
import ComplaintModule from '../modules/complaint'

export default defineLink(
	{
		linkable: UserModule.linkable.user,
		field: 'id'
	},
	{
		...ComplaintModule.linkable.complaintActivity.id,
		primaryKey: 'user_id'
	},
	{
		readOnly: true
	}
)
