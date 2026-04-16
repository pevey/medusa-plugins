import { defineLink } from '@medusajs/framework/utils'
import OrderModule from '@medusajs/medusa/order'
import OrderNoteModule from '../modules/order-note'

export default defineLink(
	{
		linkable: OrderNoteModule.linkable.orderNote,
		field: 'order_id'
	},
	OrderModule.linkable.order,
	{
		readOnly: true
	}
)
