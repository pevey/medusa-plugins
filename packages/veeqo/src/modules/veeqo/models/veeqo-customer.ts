import { model } from '@medusajs/framework/utils'
import { VeeqoOrder } from './veeqo-order'

export const VeeqoCustomer = model.define('veeqo_customer', {
	id: model.id().primaryKey(),
	customer_id: model.text().unique(),
	veeqo_customer_id: model.number().unique(),
	veeqo_orders: model.hasMany(() => VeeqoOrder, {
		mappedBy: 'veeqo_customer'
	})
})
