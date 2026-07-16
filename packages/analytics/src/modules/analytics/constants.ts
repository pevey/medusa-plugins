// Backend source of truth for the always-allowed core commerce events. These
// are captured via subscribers and never need an explicit rubric to be stored.
// (The admin UI keeps its own display copy in BACKEND_RUBRIC_NAMES.)
export const SYSTEM_RUBRICS = new Set<string>([
	'cart_created',
	'cart_updated',
	'order_placed',
	'order_canceled',
	'order_completed',
	'shipment_created',
	'customer_created',
	'customer_updated',
	'return_requested',
	'return_received'
])
