// AUTO-GENERATED — do not edit by hand.
//
// The `policies:[]` declarations @medusajs/medusa ships on its core admin
// routes, harvested from the installed package. 352 entries.
//
// Generated from @medusajs/medusa@2.18.0.
//
// Regenerate with scripts/gen-core-route-policies.cjs. Hand-written additions
// belong in supplemental-route-policies.ts, which this never overwrites.

export const CORE_ROUTE_POLICIES_MEDUSA_VERSION = '2.18.0'

type CoreRoutePolicy = {
	matcher: string
	methods?: string[]
	policies: { resource: string; operation: string | string[] }[]
}

export const coreRoutePolicies: CoreRoutePolicy[] = [
	{
		matcher: '/admin/api-keys/*',
		policies: [
			{
				resource: 'api_key',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/api-keys',
		methods: ['GET'],
		policies: [
			{
				resource: 'api_key',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/api-keys',
		methods: ['POST'],
		policies: [
			{
				resource: 'api_key',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/api-keys/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'api_key',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/api-keys/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'api_key',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/api-keys/:id/revoke',
		methods: ['POST'],
		policies: [
			{
				resource: 'api_key',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/api-keys/:id/sales-channels',
		methods: ['POST'],
		policies: [
			{
				resource: 'api_key',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/campaigns/*',
		policies: [
			{
				resource: 'campaign',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/campaigns',
		methods: ['GET'],
		policies: [
			{
				resource: 'campaign',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/campaigns',
		methods: ['POST'],
		policies: [
			{
				resource: 'campaign',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/campaigns/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'campaign',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/campaigns/:id/promotions',
		methods: ['POST'],
		policies: [
			{
				resource: 'campaign',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/campaigns/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'campaign',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/claims/*',
		policies: [
			{
				resource: 'order_claim',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/claims',
		methods: ['GET'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/claims',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/claim-items',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/claim-items/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/claim-items/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/inbound/items',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/inbound/items/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/inbound/items/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/inbound/shipping-method',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/inbound/shipping-method/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/inbound/shipping-method/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/outbound/items',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/outbound/items/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			},
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/outbound/items/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/outbound/shipping-method',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/outbound/shipping-method/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/outbound/shipping-method/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/request',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/request',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/claims/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/claims/:id/cancel',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_claim',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/collections/*',
		policies: [
			{
				resource: 'product_collection',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/collections',
		methods: ['GET'],
		policies: [
			{
				resource: 'product_collection',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/collections',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_collection',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/collections/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_collection',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/collections/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'product_collection',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/collections/:id/products',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_collection',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/currencies/*',
		policies: [
			{
				resource: 'currency',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/currencies',
		methods: ['GET'],
		policies: [
			{
				resource: 'currency',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/customer-groups/*',
		policies: [
			{
				resource: 'customer_group',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/customer-groups',
		methods: ['GET'],
		policies: [
			{
				resource: 'customer_group',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/customer-groups',
		methods: ['POST'],
		policies: [
			{
				resource: 'customer_group',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/customer-groups/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'customer_group',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/customer-groups/:id/customers',
		methods: ['POST'],
		policies: [
			{
				resource: 'customer_group',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/customer-groups/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'customer_group',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/customers/*',
		policies: [
			{
				resource: 'customer',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/customers',
		methods: ['GET'],
		policies: [
			{
				resource: 'customer',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/customers',
		methods: ['POST'],
		policies: [
			{
				resource: 'customer',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/customers/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'customer',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/customers/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'customer',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/customers/:id/addresses',
		methods: ['POST'],
		policies: [
			{
				resource: 'customer_address',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/customers/:id/addresses/:address_id',
		methods: ['GET'],
		policies: [
			{
				resource: 'customer_address',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/customers/:id/addresses/:address_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'customer_address',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/customers/:id/addresses/:address_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'customer_address',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/customers/:id/addresses',
		methods: ['GET'],
		policies: [
			{
				resource: 'customer_address',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/customers/:id/customer-groups',
		methods: ['POST'],
		policies: [
			{
				resource: 'customer',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/*',
		policies: [
			{
				resource: 'order',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/draft-orders',
		methods: ['GET'],
		policies: [
			{
				resource: 'order',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/draft-orders',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/:id/convert-to-order',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/:id/edit/items',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/:id/edit/items/item/:item_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/:id/edit/items/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/:id/edit/promotions',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/:id/edit/promotions',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/:id/edit/shipping-methods',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/:id/edit/shipping-methods/method/:method_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/draft-orders/:id/edit/shipping-methods/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/*',
		policies: [
			{
				resource: 'order_exchange',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/exchanges',
		methods: ['GET'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/exchanges',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/inbound/items',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/inbound/items/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/inbound/items/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/inbound/shipping-method',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/inbound/shipping-method/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/inbound/shipping-method/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/outbound/items',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/outbound/items/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/outbound/items/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/outbound/shipping-method',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/outbound/shipping-method/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/outbound/shipping-method/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/request',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/request',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/exchanges/:id/cancel',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_exchange',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/fulfillment-providers/*',
		policies: [
			{
				resource: 'fulfillment_provider',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/fulfillment-providers',
		methods: ['GET'],
		policies: [
			{
				resource: 'fulfillment_provider',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/fulfillment-sets/*',
		policies: [
			{
				resource: 'fulfillment_set',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/fulfillment-sets/*/service-zones/*',
		policies: [
			{
				resource: 'service_zone',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/fulfillment-sets/:id/service-zones',
		methods: ['POST'],
		policies: [
			{
				resource: 'fulfillment_set',
				operation: 'create'
			},
			{
				resource: 'service_zone',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/fulfillment-sets/:id/service-zones/:zone_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'fulfillment_set',
				operation: 'update'
			},
			{
				resource: 'service_zone',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/fulfillment-sets/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'fulfillment_set',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/fulfillment-sets/:id/service-zones/:zone_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'fulfillment_set',
				operation: 'update'
			},
			{
				resource: 'service_zone',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/fulfillment-sets/:id/service-zones/:zone_id',
		methods: ['GET'],
		policies: [
			{
				resource: 'service_zone',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/fulfillments/*',
		policies: [
			{
				resource: 'fulfillment',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/fulfillments/:id/cancel',
		methods: ['POST'],
		policies: [
			{
				resource: 'fulfillment',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/fulfillments',
		methods: ['POST'],
		policies: [
			{
				resource: 'fulfillment',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/fulfillments/:id/shipment',
		methods: ['POST'],
		policies: [
			{
				resource: 'fulfillment',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/inventory-items/*',
		policies: [
			{
				resource: 'inventory_item',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/inventory-items/*/location-levels/*',
		policies: [
			{
				resource: 'inventory_level',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/inventory-items',
		methods: ['GET'],
		policies: [
			{
				resource: 'inventory_item',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/inventory-items',
		methods: ['POST'],
		policies: [
			{
				resource: 'inventory_item',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/inventory-items/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'inventory_item',
				operation: '*'
			}
		]
	},
	{
		matcher: '/admin/inventory-items/location-levels/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'inventory_item',
				operation: '*'
			}
		]
	},
	{
		matcher: '/admin/inventory-items/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'inventory_item',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/inventory-items/:id/location-levels',
		methods: ['POST'],
		policies: [
			{
				resource: 'inventory_level',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/inventory-items/:id/location-levels/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'inventory_level',
				operation: '*'
			}
		]
	},
	{
		matcher: '/admin/inventory-items/:id/location-levels/:location_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'inventory_level',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/inventory-items/:id/location-levels/:location_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'inventory_level',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/invites',
		methods: ['GET'],
		policies: [
			{
				resource: 'invite',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/invites',
		methods: ['POST'],
		policies: [
			{
				resource: 'invite',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/invites/:id',
		methods: ['GET'],
		policies: [
			{
				resource: 'invite',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/invites/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'invite',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/invites/:id/resend',
		methods: ['POST'],
		policies: [
			{
				resource: 'invite',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/locales/*',
		policies: [
			{
				resource: 'store_locale',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/locales',
		methods: ['GET'],
		policies: [
			{
				resource: 'store_locale',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/notifications/*',
		policies: [
			{
				resource: 'notification',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/notifications',
		methods: ['GET'],
		policies: [
			{
				resource: 'notification',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/order-changes/*',
		policies: [
			{
				resource: 'order_change',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/order-changes/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_change',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/order-edits/*',
		policies: [
			{
				resource: 'order_change',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/order-edits',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_change',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/order-edits/:id/items',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_change',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/order-edits/:id/items/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_change',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/order-edits/:id/items/item/:item_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_change',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/order-edits/:id/items/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_change',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/order-edits/:id/shipping-method',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_change',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/order-edits/:id/shipping-method/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_change',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/order-edits/:id/shipping-method/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_change',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/order-edits/:id/confirm',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_change',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/order-edits/:id/request',
		methods: ['POST'],
		policies: [
			{
				resource: 'order_change',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/order-edits/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'order_change',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/orders/*',
		policies: [
			{
				resource: 'order',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/orders',
		methods: ['GET'],
		policies: [
			{
				resource: 'order',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/orders/export',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/orders/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/archive',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/cancel',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/complete',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/payment-sessions/authorize',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/credit-lines',
		methods: ['POST'],
		policies: [
			{
				resource: 'credit_line',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/fulfillments',
		methods: ['POST'],
		policies: [
			{
				resource: 'fulfillment',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/fulfillments/:fulfillment_id/cancel',
		methods: ['POST'],
		policies: [
			{
				resource: 'fulfillment',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/fulfillments/:fulfillment_id/shipments',
		methods: ['POST'],
		policies: [
			{
				resource: 'fulfillment',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/fulfillments/:fulfillment_id/mark-as-delivered',
		methods: ['POST'],
		policies: [
			{
				resource: 'fulfillment',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/transfer',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/transfer/guest',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/orders/:id/transfer/cancel',
		methods: ['POST'],
		policies: [
			{
				resource: 'order',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/payment-collections/*',
		policies: [
			{
				resource: 'payment_collection',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/payment-collections',
		methods: ['POST'],
		policies: [
			{
				resource: 'payment_collection',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/payment-collections/:id/mark-as-paid',
		methods: ['POST'],
		policies: [
			{
				resource: 'payment_collection',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/payment-collections/:id/payment-sessions',
		methods: ['POST'],
		policies: [
			{
				resource: 'payment_collection',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/payment-collections/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'payment_collection',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/payments/*',
		policies: [
			{
				resource: 'payment',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/payments',
		methods: ['GET'],
		policies: [
			{
				resource: 'payment',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/payments/:id/capture',
		methods: ['POST'],
		policies: [
			{
				resource: 'capture',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/payments/:id/refund',
		methods: ['POST'],
		policies: [
			{
				resource: 'refund',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/price-lists/*',
		policies: [
			{
				resource: 'price_list',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/price-lists/*/prices/*',
		policies: [
			{
				resource: 'price',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/price-lists',
		methods: ['GET'],
		policies: [
			{
				resource: 'price_list',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/price-lists',
		methods: ['POST'],
		policies: [
			{
				resource: 'price_list',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/price-lists/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'price_list',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/price-lists/:id/products',
		methods: ['POST'],
		policies: [
			{
				resource: 'price_list',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/price-lists/:id/prices/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'price',
				operation: '*'
			}
		]
	},
	{
		matcher: '/admin/price-preferences/*',
		policies: [
			{
				resource: 'price_preference',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/price-preferences',
		methods: ['GET'],
		policies: [
			{
				resource: 'price_preference',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/price-preferences',
		methods: ['POST'],
		policies: [
			{
				resource: 'price_preference',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/price-preferences/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'price_preference',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/price-preferences/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'price_preference',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/product-categories/*',
		policies: [
			{
				resource: 'product_category',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/product-categories',
		methods: ['GET'],
		policies: [
			{
				resource: 'product_category',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/product-categories',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_category',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/product-categories/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_category',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/product-categories/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'product_category',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/product-categories/:id/products',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_category',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/product-options/*',
		policies: [
			{
				resource: 'product_option',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/product-options',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_option',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/product-options/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_option',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/product-options/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'product_option',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/product-options/:id/values',
		methods: ['GET'],
		policies: [
			{
				resource: 'product_option',
				operation: 'read'
			},
			{
				resource: 'product_option_value',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/product-options/:id/values/:value_id',
		methods: ['GET'],
		policies: [
			{
				resource: 'product_option_value',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/product-options/:id/values/:value_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_option',
				operation: 'update'
			},
			{
				resource: 'product_option_value',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/product-options/:id/values/:value_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'product_option',
				operation: 'update'
			},
			{
				resource: 'product_option_value',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/product-tags/*',
		policies: [
			{
				resource: 'product_tag',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/product-tags',
		methods: ['GET'],
		policies: [
			{
				resource: 'product_tag',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/product-tags',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_tag',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/product-tags/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_tag',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/product-tags/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'product_tag',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/product-types/*',
		policies: [
			{
				resource: 'product_type',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/product-types',
		methods: ['GET'],
		policies: [
			{
				resource: 'product_type',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/product-types',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_type',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/product-types/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_type',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/product-types/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'product_type',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/product-variants/*',
		policies: [
			{
				resource: 'product_variant',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/product-variants',
		methods: ['GET'],
		policies: [
			{
				resource: 'product_variant',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/products/*',
		policies: [
			{
				resource: 'product',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/products/*/variants/*',
		policies: [
			{
				resource: 'product_variant',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/products/*/options/*',
		policies: [
			{
				resource: 'product_option',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/products/*/variants/*/inventory-items/*',
		policies: [
			{
				resource: 'inventory_item',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/products',
		methods: ['GET'],
		policies: [
			{
				resource: 'product',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/products',
		methods: ['POST'],
		policies: [
			{
				resource: 'product',
				operation: 'create'
			},
			{
				resource: 'inventory_item',
				operation: 'create'
			},
			{
				resource: 'price',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/products/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'product',
				operation: ['create', 'update']
			}
		]
	},
	{
		matcher: '/admin/products/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'product',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/products/:id/variants',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_variant',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/products/:id/variants/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_variant',
				operation: ['create', 'update', 'delete']
			}
		]
	},
	{
		matcher: '/admin/products/:id/variants/:variant_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'product_variant',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/products/:id/options/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'product_option',
				operation: ['delete', 'create', 'update']
			}
		]
	},
	{
		matcher: '/admin/products/:id/variants/inventory-items/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'inventory_item',
				operation: ['create', 'update', 'delete']
			}
		]
	},
	{
		matcher: '/admin/products/:id/variants/:variant_id/inventory-items',
		methods: ['POST'],
		policies: [
			{
				resource: 'inventory_item',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/products/:id/variants/:variant_id/inventory-items/:inventory_item_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'inventory_item',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/products/:id/variants/:variant_id/inventory-items/:inventory_item_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'inventory_item',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/promotions/*',
		policies: [
			{
				resource: 'promotion',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/promotions',
		methods: ['GET'],
		policies: [
			{
				resource: 'promotion',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/promotions',
		methods: ['POST'],
		policies: [
			{
				resource: 'promotion',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/promotions/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'promotion',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/promotions/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'promotion',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/promotions/:id/rules/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'promotion',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/promotions/:id/target-rules/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'promotion',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/promotions/:id/buy-rules/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'promotion',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles',
		methods: ['GET'],
		policies: [
			{
				resource: 'rbac_role',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles/assignable',
		methods: ['GET'],
		policies: [
			{
				resource: 'rbac_role',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles/:id',
		methods: ['GET'],
		policies: [
			{
				resource: 'rbac_role',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'rbac_role',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles/:id/policies',
		methods: ['GET'],
		policies: [
			{
				resource: 'rbac_role',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles/:id/policies',
		methods: ['POST'],
		policies: [
			{
				resource: 'rbac_role',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles/:id/policies/:policy_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'rbac_role',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles/:id/users',
		methods: ['GET'],
		policies: [
			{
				resource: 'user',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles/:id/users',
		methods: ['POST'],
		policies: [
			{
				resource: 'user',
				operation: 'update'
			},
			{
				resource: 'rbac_role',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles/:id/users',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'user',
				operation: 'update'
			},
			{
				resource: 'rbac_role',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/rbac/roles/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'rbac_role',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/rbac/policies',
		methods: ['GET'],
		policies: [
			{
				resource: 'rbac_policy',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/rbac/policies/assignable',
		methods: ['GET'],
		policies: [
			{
				resource: 'rbac_policy',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/rbac/policies/:id',
		methods: ['GET'],
		policies: [
			{
				resource: 'rbac_policy',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/rbac/policies/:id/roles',
		methods: ['GET'],
		policies: [
			{
				resource: 'rbac_policy',
				operation: 'read'
			},
			{
				resource: 'rbac_role',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/rbac/policies',
		methods: ['POST'],
		policies: [
			{
				resource: 'rbac_policy',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/rbac/policies/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'rbac_policy',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/rbac/policies/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'rbac_policy',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/refund-reasons/*',
		policies: [
			{
				resource: 'refund_reason',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/refund-reasons',
		methods: ['GET'],
		policies: [
			{
				resource: 'refund_reason',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/refund-reasons',
		methods: ['POST'],
		policies: [
			{
				resource: 'refund_reason',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/refund-reasons/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'refund_reason',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/refund-reasons/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'refund_reason',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/regions/*',
		policies: [
			{
				resource: 'region',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/regions',
		methods: ['GET'],
		policies: [
			{
				resource: 'region',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/regions',
		methods: ['POST'],
		policies: [
			{
				resource: 'region',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/regions/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'region',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/regions/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'region',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/reservations/*',
		policies: [
			{
				resource: 'reservation_item',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/reservations',
		methods: ['GET'],
		policies: [
			{
				resource: 'reservation_item',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/reservations',
		methods: ['POST'],
		policies: [
			{
				resource: 'reservation_item',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/reservations/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'reservation_item',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/reservations/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'reservation_item',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/return-reasons/*',
		policies: [
			{
				resource: 'return_reason',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/return-reasons',
		methods: ['GET'],
		policies: [
			{
				resource: 'return_reason',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/return-reasons',
		methods: ['POST'],
		policies: [
			{
				resource: 'return_reason',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/return-reasons/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'return_reason',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/return-reasons/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'return_reason',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/returns/*',
		policies: [
			{
				resource: 'return',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/returns',
		methods: ['GET'],
		policies: [
			{
				resource: 'return',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/returns/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/request-items',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/request-items/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/request-items/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/shipping-method',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/shipping-method/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/shipping-method/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/request',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/cancel',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/request',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'return',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/receive',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/receive',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/receive/confirm',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/receive-items',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/receive-items/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/receive-items/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/dismiss-items',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/dismiss-items/:action_id',
		methods: ['POST'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/returns/:id/dismiss-items/:action_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'return',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/sales-channels/*',
		policies: [
			{
				resource: 'sales_channel',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/sales-channels',
		methods: ['GET'],
		policies: [
			{
				resource: 'sales_channel',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/sales-channels',
		methods: ['POST'],
		policies: [
			{
				resource: 'sales_channel',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/sales-channels/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'sales_channel',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/sales-channels/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'sales_channel',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/sales-channels/:id/products',
		methods: ['POST'],
		policies: [
			{
				resource: 'sales_channel',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/shipping-option-types/*',
		policies: [
			{
				resource: 'shipping_option_type',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/shipping-option-types',
		methods: ['GET'],
		policies: [
			{
				resource: 'shipping_option_type',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/shipping-option-types',
		methods: ['POST'],
		policies: [
			{
				resource: 'shipping_option_type',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/shipping-option-types/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'shipping_option_type',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/shipping-option-types/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'shipping_option_type',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/shipping-options/*',
		policies: [
			{
				resource: 'shipping_option',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/shipping-options',
		methods: ['GET'],
		policies: [
			{
				resource: 'shipping_option',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/shipping-options',
		methods: ['POST'],
		policies: [
			{
				resource: 'shipping_option',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/shipping-options/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'shipping_option',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/shipping-options/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'shipping_option',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/shipping-options/:id/rules/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'shipping_option',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/shipping-profiles/*',
		policies: [
			{
				resource: 'shipping_profile',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/shipping-profiles',
		methods: ['POST'],
		policies: [
			{
				resource: 'shipping_profile',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/shipping-profiles',
		methods: ['GET'],
		policies: [
			{
				resource: 'shipping_profile',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/shipping-profiles/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'shipping_profile',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/shipping-profiles/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'shipping_profile',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/stock-locations/*',
		policies: [
			{
				resource: 'stock_location',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/stock-locations',
		methods: ['POST'],
		policies: [
			{
				resource: 'stock_location',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/stock-locations',
		methods: ['GET'],
		policies: [
			{
				resource: 'stock_location',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/stock-locations/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'stock_location',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/stock-locations/:id/fulfillment-sets',
		methods: ['POST'],
		policies: [
			{
				resource: 'stock_location',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/stock-locations/:id/sales-channels',
		methods: ['POST'],
		policies: [
			{
				resource: 'stock_location',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/stock-locations/:id/fulfillment-providers',
		methods: ['POST'],
		policies: [
			{
				resource: 'stock_location',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/stock-locations/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'stock_location',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/stores/*',
		policies: [
			{
				resource: 'store',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/stores',
		methods: ['GET'],
		policies: [
			{
				resource: 'store',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/stores/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'store',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/tax-providers/*',
		policies: [
			{
				resource: 'tax_provider',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/tax-providers',
		methods: ['GET'],
		policies: [
			{
				resource: 'tax_provider',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/tax-rates/*',
		policies: [
			{
				resource: 'tax_rate',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/tax-rates',
		methods: ['POST'],
		policies: [
			{
				resource: 'tax_rate',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/tax-rates/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'tax_rate',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/tax-rates',
		methods: ['GET'],
		policies: [
			{
				resource: 'tax_rate',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/tax-rates/:id/rules',
		methods: ['POST'],
		policies: [
			{
				resource: 'tax_rate',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/tax-rates/:id/rules/:rule_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'tax_rate',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/tax-regions/*',
		policies: [
			{
				resource: 'tax_region',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/tax-regions',
		methods: ['POST'],
		policies: [
			{
				resource: 'tax_region',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/tax-regions/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'tax_region',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/tax-regions',
		methods: ['GET'],
		policies: [
			{
				resource: 'tax_region',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/tax-regions/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'tax_region',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/translations/*',
		policies: [
			{
				resource: 'translation',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/translations',
		methods: ['GET'],
		policies: [
			{
				resource: 'translation',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/translations/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'translation',
				operation: 'create'
			},
			{
				resource: 'translation',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/translations/settings',
		methods: ['GET'],
		policies: [
			{
				resource: 'translation_setting',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/translations/settings/batch',
		methods: ['POST'],
		policies: [
			{
				resource: 'translation_setting',
				operation: 'create'
			},
			{
				resource: 'translation_setting',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/translations/entities',
		methods: ['GET'],
		policies: [
			{
				resource: 'translation',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/uploads/*',
		policies: [
			{
				resource: 'file',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/uploads',
		methods: ['POST'],
		policies: [
			{
				resource: 'file',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/uploads/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'file',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/uploads/presigned-urls',
		methods: ['POST'],
		policies: [
			{
				resource: 'file',
				operation: 'create'
			}
		]
	},
	{
		matcher: '/admin/users',
		methods: ['GET'],
		policies: [
			{
				resource: 'user',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/users/:id',
		methods: ['GET'],
		policies: [
			{
				resource: 'user',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/users/:id',
		methods: ['POST'],
		policies: [
			{
				resource: 'user',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/users/:id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'user',
				operation: 'delete'
			}
		]
	},
	{
		matcher: '/admin/users/:id/roles',
		methods: ['GET'],
		policies: [
			{
				resource: 'user',
				operation: 'read'
			},
			{
				resource: 'rbac_role',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/users/:id/roles',
		methods: ['POST'],
		policies: [
			{
				resource: 'user',
				operation: 'update'
			},
			{
				resource: 'rbac_role',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/users/:id/roles/:role_id',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'user',
				operation: 'update'
			},
			{
				resource: 'rbac_role',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/users/:id/roles',
		methods: ['DELETE'],
		policies: [
			{
				resource: 'user',
				operation: 'update'
			},
			{
				resource: 'rbac_role',
				operation: 'update'
			}
		]
	},
	{
		matcher: '/admin/workflows-executions/*',
		policies: [
			{
				resource: 'workflow_execution',
				operation: 'read'
			}
		]
	},
	{
		matcher: '/admin/workflows-executions',
		methods: ['GET'],
		policies: [
			{
				resource: 'workflow_execution',
				operation: 'read'
			}
		]
	}
]
