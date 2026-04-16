import { model } from '@medusajs/framework/utils'

export enum CustomerActivityType {
	POSTVIEW = 'post_view',
	SEARCH = 'search',
	ADDTOCART = 'add_to_cart',
	REMOVEFROMCART = 'remove_from_cart',
	ORDERPLACED = 'order_placed',
	ORDERCANCELED = 'order_canceled',
	ORDERRETURNED = 'order_returned'
}

export const CustomerActivity = model.define('customerActivity', {
	id: model.id().primaryKey(),
	type: model.enum(CustomerActivityType),
	user_id: model.text(),
	metadata: model.json().nullable()
})

/*
metadata
- for post_view: { blog_post_id }
- for search: { q }
- for add_to_cart and remove_from_cart: { variant_id, quantity }
- for order_placed, order_canceled, order_returned: { order_id }
*/
