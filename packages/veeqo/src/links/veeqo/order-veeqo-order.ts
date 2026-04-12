import { defineLink } from '@medusajs/framework/utils'
import OrderModule from '@medusajs/medusa/order'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: OrderModule.linkable.order,
		field: 'id'
	},
	{
		...VeeqoModule.linkable.veeqoOrder.id,
		primaryKey: 'order_id'
	},
	{
		readOnly: true
	}
)
