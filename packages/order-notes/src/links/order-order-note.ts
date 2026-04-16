import { defineLink } from '@medusajs/framework/utils'
import OrderModule from '@medusajs/medusa/order'
import OrderNoteModule from '../modules/order-note'

export default defineLink(
	{
		linkable: OrderModule.linkable.order,
		field: 'id'
	},
	{
		...OrderNoteModule.linkable.orderNote.id,
		primaryKey: 'order_id'
	},
	{
		readOnly: true
	}
)
