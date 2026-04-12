import { defineLink } from '@medusajs/framework/utils'
import OrderModule from '@medusajs/medusa/order'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: VeeqoModule.linkable.veeqoOrder,
		field: 'order_id'
	},
	OrderModule.linkable.order,
	{
		readOnly: true
	}
)
