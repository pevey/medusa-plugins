import { model } from '@medusajs/framework/utils'
import { VeeqoCustomer } from './veeqo-customer'
import { VeeqoShipment } from './veeqo-shipment'

export enum Status {
	OPEN = 'open',
	CLOSED = 'closed'
}

export enum SourceType {
	ORDER_PLACED = 'order_placed',
	CLAIM = 'claim',
	EXCHANGE = 'exchange'
}

export const VeeqoOrder = model
	.define('veeqo_order', {
		id: model.id().primaryKey(),
		status: model.enum(Status).default(Status.OPEN),
		last_synced_at: model.dateTime().nullable(),
		// No longer unique — a Medusa order can have multiple VeeqoOrders.
		order_id: model.text(),
		source_type: model.enum(SourceType).default(SourceType.ORDER_PLACED),
		// For ORDER_PLACED, equals order_id. For CLAIM, the order_claim id. For EXCHANGE, the order_exchange id.
		source_id: model.text(),
		// Nullable to support the placeholder-row pattern during in-flight create attempts.
		// Postgres allows multiple NULLs in a unique index, so existing uniqueness invariant is preserved.
		veeqo_order_id: model.number().unique().nullable(),
		veeqo_status: model.text().nullable(),
		// Last error message from a failed sync attempt; NULL when healthy.
		last_sync_error: model.text().nullable(),
		// Timestamp of the last create attempt (success or failure).
		last_sync_attempted_at: model.dateTime().nullable(),
		veeqo_customer: model.belongsTo(() => VeeqoCustomer, {
			mappedBy: 'veeqo_orders'
		}),
		veeqo_shipments: model.hasMany(() => VeeqoShipment, {
			mappedBy: 'veeqo_order'
		})
	})
	.indexes([{ on: ['source_type', 'source_id'], unique: true }])
