import { model } from '@medusajs/framework/utils'
import { VeeqoCustomer } from './veeqo-customer'
import { VeeqoShipment } from './veeqo-shipment'

export enum Status {
	OPEN = 'open',
	CLOSED = 'closed'
}

export const VeeqoOrder = model.define('veeqo_order', {
	id: model.id().primaryKey(),
	status: model.enum(Status).default(Status.OPEN),
	last_synced_at: model.dateTime().nullable(),
	order_id: model.text().unique(),
	veeqo_order_id: model.number().unique(),
	veeqo_status: model.text().nullable(),
	veeqo_customer: model.belongsTo(() => VeeqoCustomer, {
		mappedBy: 'veeqo_orders'
	}),
	veeqo_shipments: model.hasMany(() => VeeqoShipment, {
		mappedBy: 'veeqo_order'
	})
})
