// Static registry of all standard Medusa events and their payload schemas.
// Used in the webhook configuration UI for event selection and field mapping.

export type EventPayloadField = {
	key: string
	type: 'string' | 'number' | 'boolean' | 'object' | 'array'
	fields?: EventPayloadField[] // for objects
}

export type MedusaEvent = {
	name: string
	label: string
	category: string
	payload: EventPayloadField[]
}

export const MEDUSA_EVENTS: MedusaEvent[] = [
	// Auth
	{
		name: 'auth.password_reset',
		label: 'Password Reset',
		category: 'Auth',
		payload: [
			{ key: 'entity_id', type: 'string' },
			{ key: 'actor_type', type: 'string' },
			{ key: 'token', type: 'string' },
			{ key: 'metadata', type: 'object' }
		]
	},
	// Cart
	{ name: 'cart.created', label: 'Cart Created', category: 'Cart', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'cart.updated', label: 'Cart Updated', category: 'Cart', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'cart.region_updated', label: 'Cart Region Updated', category: 'Cart', payload: [{ key: 'id', type: 'string' }] },
	{
		name: 'cart.customer_transferred',
		label: 'Cart Customer Transferred',
		category: 'Cart',
		payload: [{ key: 'id', type: 'string' }, { key: 'customer_id', type: 'string' }]
	},
	// Customer
	{ name: 'customer.created', label: 'Customer Created', category: 'Customer', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'customer.updated', label: 'Customer Updated', category: 'Customer', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'customer.deleted', label: 'Customer Deleted', category: 'Customer', payload: [{ key: 'id', type: 'string' }] },
	// Fulfillment
	{ name: 'shipment.created', label: 'Shipment Created', category: 'Fulfillment', payload: [{ key: 'id', type: 'string' }, { key: 'no_notification', type: 'boolean' }] },
	{ name: 'delivery.created', label: 'Delivery Created', category: 'Fulfillment', payload: [{ key: 'id', type: 'string' }] },
	// Invite
	{ name: 'invite.accepted', label: 'Invite Accepted', category: 'Invite', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'invite.created', label: 'Invite Created', category: 'Invite', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'invite.deleted', label: 'Invite Deleted', category: 'Invite', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'invite.resent', label: 'Invite Resent', category: 'Invite', payload: [{ key: 'id', type: 'string' }] },
	// Order Edit
	{
		name: 'order-edit.requested',
		label: 'Order Edit Requested',
		category: 'Order Edit',
		payload: [{ key: 'order_id', type: 'string' }, { key: 'actions', type: 'array' }]
	},
	{
		name: 'order-edit.confirmed',
		label: 'Order Edit Confirmed',
		category: 'Order Edit',
		payload: [{ key: 'order_id', type: 'string' }, { key: 'actions', type: 'array' }]
	},
	{
		name: 'order-edit.canceled',
		label: 'Order Edit Canceled',
		category: 'Order Edit',
		payload: [{ key: 'order_id', type: 'string' }, { key: 'actions', type: 'array' }]
	},
	// Order
	{ name: 'order.updated', label: 'Order Updated', category: 'Order', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'order.placed', label: 'Order Placed', category: 'Order', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'order.canceled', label: 'Order Canceled', category: 'Order', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'order.completed', label: 'Order Completed', category: 'Order', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'order.archived', label: 'Order Archived', category: 'Order', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'order.fulfillment_created', label: 'Order Fulfillment Created', category: 'Order', payload: [{ key: 'order_id', type: 'string' }, { key: 'fulfillment_id', type: 'string' }, { key: 'no_notification', type: 'boolean' }] },
	{ name: 'order.fulfillment_canceled', label: 'Order Fulfillment Canceled', category: 'Order', payload: [{ key: 'order_id', type: 'string' }, { key: 'fulfillment_id', type: 'string' }, { key: 'no_notification', type: 'boolean' }] },
	{ name: 'order.return_requested', label: 'Order Return Requested', category: 'Order', payload: [{ key: 'order_id', type: 'string' }, { key: 'return_id', type: 'string' }] },
	{ name: 'order.return_received', label: 'Order Return Received', category: 'Order', payload: [{ key: 'order_id', type: 'string' }, { key: 'return_id', type: 'string' }] },
	{ name: 'order.claim_created', label: 'Order Claim Created', category: 'Order', payload: [{ key: 'order_id', type: 'string' }, { key: 'claim_id', type: 'string' }] },
	{ name: 'order.exchange_created', label: 'Order Exchange Created', category: 'Order', payload: [{ key: 'order_id', type: 'string' }, { key: 'exchange_id', type: 'string' }] },
	{ name: 'order.transfer_requested', label: 'Order Transfer Requested', category: 'Order', payload: [{ key: 'id', type: 'string' }, { key: 'order_change_id', type: 'string' }] },
	// Payment
	{ name: 'payment.captured', label: 'Payment Captured', category: 'Payment', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'payment.refunded', label: 'Payment Refunded', category: 'Payment', payload: [{ key: 'id', type: 'string' }] },
	// Product Category
	{ name: 'product-category.created', label: 'Product Category Created', category: 'Product Category', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-category.updated', label: 'Product Category Updated', category: 'Product Category', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-category.deleted', label: 'Product Category Deleted', category: 'Product Category', payload: [{ key: 'id', type: 'string' }] },
	// Product Collection
	{ name: 'product-collection.created', label: 'Product Collection Created', category: 'Product Collection', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-collection.updated', label: 'Product Collection Updated', category: 'Product Collection', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-collection.deleted', label: 'Product Collection Deleted', category: 'Product Collection', payload: [{ key: 'id', type: 'string' }] },
	// Product Option
	{ name: 'product-option.created', label: 'Product Option Created', category: 'Product Option', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-option.updated', label: 'Product Option Updated', category: 'Product Option', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-option.deleted', label: 'Product Option Deleted', category: 'Product Option', payload: [{ key: 'id', type: 'string' }] },
	// Product Tag
	{ name: 'product-tag.created', label: 'Product Tag Created', category: 'Product Tag', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-tag.updated', label: 'Product Tag Updated', category: 'Product Tag', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-tag.deleted', label: 'Product Tag Deleted', category: 'Product Tag', payload: [{ key: 'id', type: 'string' }] },
	// Product Type
	{ name: 'product-type.created', label: 'Product Type Created', category: 'Product Type', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-type.updated', label: 'Product Type Updated', category: 'Product Type', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-type.deleted', label: 'Product Type Deleted', category: 'Product Type', payload: [{ key: 'id', type: 'string' }] },
	// Product Variant
	{ name: 'product-variant.created', label: 'Product Variant Created', category: 'Product Variant', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-variant.updated', label: 'Product Variant Updated', category: 'Product Variant', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product-variant.deleted', label: 'Product Variant Deleted', category: 'Product Variant', payload: [{ key: 'id', type: 'string' }] },
	// Product
	{ name: 'product.created', label: 'Product Created', category: 'Product', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product.updated', label: 'Product Updated', category: 'Product', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'product.deleted', label: 'Product Deleted', category: 'Product', payload: [{ key: 'id', type: 'string' }] },
	// Region
	{ name: 'region.created', label: 'Region Created', category: 'Region', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'region.updated', label: 'Region Updated', category: 'Region', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'region.deleted', label: 'Region Deleted', category: 'Region', payload: [{ key: 'id', type: 'string' }] },
	// Sales Channel
	{ name: 'sales-channel.created', label: 'Sales Channel Created', category: 'Sales Channel', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'sales-channel.updated', label: 'Sales Channel Updated', category: 'Sales Channel', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'sales-channel.deleted', label: 'Sales Channel Deleted', category: 'Sales Channel', payload: [{ key: 'id', type: 'string' }] },
	// Shipping Option Type
	{ name: 'shipping-option-type.created', label: 'Shipping Option Type Created', category: 'Shipping Option', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'shipping-option-type.updated', label: 'Shipping Option Type Updated', category: 'Shipping Option', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'shipping-option-type.deleted', label: 'Shipping Option Type Deleted', category: 'Shipping Option', payload: [{ key: 'id', type: 'string' }] },
	// Shipping Option
	{ name: 'shipping-option.created', label: 'Shipping Option Created', category: 'Shipping Option', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'shipping-option.updated', label: 'Shipping Option Updated', category: 'Shipping Option', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'shipping-option.deleted', label: 'Shipping Option Deleted', category: 'Shipping Option', payload: [{ key: 'id', type: 'string' }] },
	// Translation
	{ name: 'translation.created', label: 'Translation Created', category: 'Translation', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'translation.updated', label: 'Translation Updated', category: 'Translation', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'translation.deleted', label: 'Translation Deleted', category: 'Translation', payload: [{ key: 'id', type: 'string' }] },
	// User
	{ name: 'user.created', label: 'User Created', category: 'User', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'user.updated', label: 'User Updated', category: 'User', payload: [{ key: 'id', type: 'string' }] },
	{ name: 'user.deleted', label: 'User Deleted', category: 'User', payload: [{ key: 'id', type: 'string' }] }
]

export const MEDUSA_EVENTS_BY_NAME = Object.fromEntries(MEDUSA_EVENTS.map(e => [e.name, e]))

export const MEDUSA_EVENT_CATEGORIES = [...new Set(MEDUSA_EVENTS.map(e => e.category))]
