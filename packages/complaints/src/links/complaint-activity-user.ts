import { defineLink } from '@medusajs/framework/utils'
import UserModule from '@medusajs/medusa/user'
import ComplaintModule from '../modules/complaint'

export default defineLink(
	{
		linkable: ComplaintModule.linkable.complaintActivity,
		field: 'user_id'
	},
	UserModule.linkable.user,
	{
		readOnly: true
	}
)
