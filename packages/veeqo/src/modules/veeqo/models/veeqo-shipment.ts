import { model } from '@medusajs/framework/utils'
import { VeeqoOrder } from './veeqo-order'

export const VeeqoShipment = model.define('veeqo_shipment', {
	id: model.id().primaryKey(),
	fulfillment_id: model.text(),
	veeqo_allocation_id: model.number().unique(),
	veeqo_shipment_id: model.number().unique(),
	carrier: model.json().nullable(),
	tracking_number: model.json().nullable(),
	shipped_by: model.json().nullable(),
	shipped_at: model.dateTime().nullable(),
	veeqo_tracking_events: model.json().nullable(),
	veeqo_order: model.belongsTo(() => VeeqoOrder, {
		mappedBy: 'veeqo_shipments'
	})
})
