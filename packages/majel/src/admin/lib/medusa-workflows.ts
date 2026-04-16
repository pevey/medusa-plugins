// Curated list of core-flows workflows available for webhook receive configuration.
// Each entry documents the workflow name, a human label, category, and the shape
// of its input so the UI can render a targeted field mapper.
// Input shapes verified against https://docs.medusajs.com/resources/references/medusa-workflows/

export type WorkflowInputField = {
	key: string
	// 'object' means the value itself is a nested object; use `fields` to describe it
	// 'array'  may have `fields` (array of objects) or not (array of primitives)
	type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'unknown'
	optional?: boolean
	fields?: WorkflowInputField[] // nested fields for type === 'object' or type === 'array'
}

export type MedusaWorkflow = {
	name: string       // exact export name from @medusajs/medusa/core-flows
	label: string      // human-readable
	category: string
	// Top-level keys of the workflow input object.
	inputFields: WorkflowInputField[]
	// Whether the workflow input has an `additional_data` escape-hatch field.
	hasAdditionalData: boolean
}

export const MEDUSA_WORKFLOWS: MedusaWorkflow[] = [
	// ─── Customer ───────────────────────────────────────────────────────────────
	{
		name: 'createCustomersWorkflow',
		label: 'createCustomersWorkflow',
		category: 'Customer',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'customersData',
				type: 'array',
				fields: [
					{ key: 'first_name', type: 'string', optional: true },
					{ key: 'last_name', type: 'string', optional: true },
					{ key: 'email', type: 'string', optional: true },
					{ key: 'phone', type: 'string', optional: true },
					{ key: 'company_name', type: 'string', optional: true },
					{ key: 'has_account', type: 'boolean', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'updateCustomersWorkflow',
		label: 'updateCustomersWorkflow',
		category: 'Customer',
		hasAdditionalData: true,
		// selector+update pattern — not array of objects
		inputFields: [
			{
				key: 'selector',
				type: 'object',
				fields: [
					{ key: 'id', type: 'string', optional: true },
					{ key: 'email', type: 'string', optional: true },
					{ key: 'company_name', type: 'string', optional: true },
					{ key: 'has_account', type: 'boolean', optional: true }
				]
			},
			{
				key: 'update',
				type: 'object',
				fields: [
					{ key: 'first_name', type: 'string', optional: true },
					{ key: 'last_name', type: 'string', optional: true },
					{ key: 'email', type: 'string', optional: true },
					{ key: 'phone', type: 'string', optional: true },
					{ key: 'company_name', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'deleteCustomersWorkflow',
		label: 'deleteCustomersWorkflow',
		category: 'Customer',
		hasAdditionalData: false,
		inputFields: [
			{ key: 'ids', type: 'array' }
		]
	},
	{
		name: 'createCustomerAddressesWorkflow',
		label: 'createCustomerAddressesWorkflow',
		category: 'Customer',
		hasAdditionalData: true,
		// customer_id lives INSIDE each address DTO (not top-level)
		inputFields: [
			{
				key: 'addresses',
				type: 'array',
				fields: [
					{ key: 'customer_id', type: 'string' },
					{ key: 'address_name', type: 'string', optional: true },
					{ key: 'is_default_shipping', type: 'boolean', optional: true },
					{ key: 'is_default_billing', type: 'boolean', optional: true },
					{ key: 'company', type: 'string', optional: true },
					{ key: 'first_name', type: 'string', optional: true },
					{ key: 'last_name', type: 'string', optional: true },
					{ key: 'address_1', type: 'string', optional: true },
					{ key: 'address_2', type: 'string', optional: true },
					{ key: 'city', type: 'string', optional: true },
					{ key: 'country_code', type: 'string', optional: true },
					{ key: 'province', type: 'string', optional: true },
					{ key: 'postal_code', type: 'string', optional: true },
					{ key: 'phone', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'updateCustomerAddressesWorkflow',
		label: 'updateCustomerAddressesWorkflow',
		category: 'Customer',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'selector',
				type: 'object',
				fields: [
					{ key: 'id', type: 'string', optional: true },
					{ key: 'customer_id', type: 'string', optional: true }
				]
			},
			{
				key: 'update',
				type: 'object',
				fields: [
					{ key: 'address_name', type: 'string', optional: true },
					{ key: 'is_default_shipping', type: 'boolean', optional: true },
					{ key: 'is_default_billing', type: 'boolean', optional: true },
					{ key: 'company', type: 'string', optional: true },
					{ key: 'first_name', type: 'string', optional: true },
					{ key: 'last_name', type: 'string', optional: true },
					{ key: 'address_1', type: 'string', optional: true },
					{ key: 'address_2', type: 'string', optional: true },
					{ key: 'city', type: 'string', optional: true },
					{ key: 'country_code', type: 'string', optional: true },
					{ key: 'province', type: 'string', optional: true },
					{ key: 'postal_code', type: 'string', optional: true },
					{ key: 'phone', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'deleteCustomerAddressesWorkflow',
		label: 'deleteCustomerAddressesWorkflow',
		category: 'Customer',
		hasAdditionalData: false,
		inputFields: [{ key: 'ids', type: 'array' }]
	},
	{
		name: 'createCustomerGroupsWorkflow',
		label: 'createCustomerGroupsWorkflow',
		category: 'Customer',
		hasAdditionalData: false,
		inputFields: [
			{
				key: 'customersData',
				type: 'array',
				fields: [
					{ key: 'name', type: 'string' },
					{ key: 'metadata', type: 'object', optional: true },
					{ key: 'created_by', type: 'string', optional: true }
				]
			}
		]
	},
	{
		name: 'deleteCustomerGroupsWorkflow',
		label: 'deleteCustomerGroupsWorkflow',
		category: 'Customer',
		hasAdditionalData: false,
		inputFields: [{ key: 'ids', type: 'array' }]
	},
	// ─── Order ──────────────────────────────────────────────────────────────────
	{
		name: 'cancelOrderWorkflow',
		label: 'cancelOrderWorkflow',
		category: 'Order',
		hasAdditionalData: false,
		inputFields: [
			{ key: 'order_id', type: 'string' },
			{ key: 'no_notification', type: 'boolean', optional: true },
			{ key: 'canceled_by', type: 'string', optional: true }
		]
	},
	{
		name: 'archiveOrderWorkflow',
		label: 'archiveOrderWorkflow',
		category: 'Order',
		hasAdditionalData: false,
		// takes orderIds (plural array), NOT singular order_id
		inputFields: [
			{ key: 'orderIds', type: 'array' }
		]
	},
	{
		name: 'completeOrderWorkflow',
		label: 'completeOrderWorkflow',
		category: 'Order',
		hasAdditionalData: true,
		// takes orderIds (plural array), NOT singular order_id
		inputFields: [
			{ key: 'orderIds', type: 'array' }
		]
	},
	{
		name: 'createOrderFulfillmentWorkflow',
		label: 'createOrderFulfillmentWorkflow',
		category: 'Order',
		hasAdditionalData: true,
		inputFields: [
			{ key: 'order_id', type: 'string' },
			{ key: 'created_by', type: 'string' },
			{ key: 'shipping_option_id', type: 'string' },
			{ key: 'requires_shipping', type: 'boolean' },
			{ key: 'location_id', type: 'string', optional: true },
			{ key: 'no_notification', type: 'boolean', optional: true },
			{ key: 'metadata', type: 'object', optional: true },
			{
				key: 'items',
				type: 'array',
				fields: [
					{ key: 'id', type: 'string' },
					{ key: 'quantity', type: 'number' }
				]
			},
			{
				key: 'labels',
				type: 'array',
				optional: true,
				fields: [
					{ key: 'tracking_number', type: 'string' },
					{ key: 'tracking_url', type: 'string', optional: true },
					{ key: 'label_url', type: 'string', optional: true }
				]
			}
		]
	},
	{
		name: 'createOrderShipmentWorkflow',
		label: 'createOrderShipmentWorkflow',
		category: 'Order',
		hasAdditionalData: true,
		inputFields: [
			{ key: 'order_id', type: 'string' },
			{ key: 'fulfillment_id', type: 'string' },
			{
				key: 'items',
				type: 'array',
				fields: [
					{ key: 'id', type: 'string' },
					{ key: 'quantity', type: 'number' }
				]
			},
			{ key: 'created_by', type: 'string', optional: true },
			{ key: 'no_notification', type: 'boolean', optional: true },
			{ key: 'metadata', type: 'object', optional: true },
			{
				key: 'labels',
				type: 'array',
				optional: true,
				fields: [
					{ key: 'tracking_number', type: 'string' },
					{ key: 'tracking_url', type: 'string', optional: true },
					{ key: 'label_url', type: 'string', optional: true }
				]
			}
		]
	},
	{
		name: 'beginReturnOrderWorkflow',
		label: 'beginReturnOrderWorkflow',
		category: 'Order',
		hasAdditionalData: false,
		// No items[] — items are added separately after the return is begun
		inputFields: [
			{ key: 'order_id', type: 'string' },
			{ key: 'location_id', type: 'string', optional: true },
			{ key: 'created_by', type: 'string', optional: true },
			{ key: 'internal_note', type: 'string', optional: true },
			{ key: 'description', type: 'string', optional: true },
			{ key: 'metadata', type: 'object', optional: true }
		]
	},
	{
		name: 'cancelReturnWorkflow',
		label: 'cancelReturnWorkflow',
		category: 'Order',
		hasAdditionalData: false,
		inputFields: [
			{ key: 'return_id', type: 'string' },
			{ key: 'no_notification', type: 'boolean', optional: true },
			{ key: 'canceled_by', type: 'string', optional: true }
		]
	},
	// ─── Product ────────────────────────────────────────────────────────────────
	{
		name: 'createProductsWorkflow',
		label: 'createProductsWorkflow',
		category: 'Product',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'products',
				type: 'array',
				fields: [
					{ key: 'title', type: 'string' },
					{ key: 'description', type: 'string', optional: true },
					{ key: 'handle', type: 'string', optional: true },
					{ key: 'status', type: 'string', optional: true },
					{ key: 'thumbnail', type: 'string', optional: true },
					{ key: 'shipping_profile_id', type: 'string', optional: true },
					{ key: 'weight', type: 'number', optional: true },
					{ key: 'length', type: 'number', optional: true },
					{ key: 'height', type: 'number', optional: true },
					{ key: 'width', type: 'number', optional: true },
					{ key: 'origin_country', type: 'string', optional: true },
					{ key: 'hs_code', type: 'string', optional: true },
					{ key: 'mid_code', type: 'string', optional: true },
					{ key: 'material', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'updateProductsWorkflow',
		label: 'updateProductsWorkflow',
		category: 'Product',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'products',
				type: 'array',
				fields: [
					{ key: 'id', type: 'string' },
					{ key: 'title', type: 'string', optional: true },
					{ key: 'description', type: 'string', optional: true },
					{ key: 'handle', type: 'string', optional: true },
					{ key: 'status', type: 'string', optional: true },
					{ key: 'thumbnail', type: 'string', optional: true },
					{ key: 'weight', type: 'number', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'deleteProductsWorkflow',
		label: 'deleteProductsWorkflow',
		category: 'Product',
		hasAdditionalData: false,
		inputFields: [
			{ key: 'ids', type: 'array' }
		]
	},
	{
		name: 'createProductVariantsWorkflow',
		label: 'createProductVariantsWorkflow',
		category: 'Product',
		hasAdditionalData: true,
		// key is `product_variants` (not `productVariants`)
		inputFields: [
			{
				key: 'product_variants',
				type: 'array',
				fields: [
					{ key: 'product_id', type: 'string' },
					{ key: 'title', type: 'string' },
					{ key: 'sku', type: 'string', optional: true },
					{ key: 'barcode', type: 'string', optional: true },
					{ key: 'ean', type: 'string', optional: true },
					{ key: 'upc', type: 'string', optional: true },
					{ key: 'allow_backorder', type: 'boolean', optional: true },
					{ key: 'manage_inventory', type: 'boolean', optional: true },
					{ key: 'hs_code', type: 'string', optional: true },
					{ key: 'origin_country', type: 'string', optional: true },
					{ key: 'material', type: 'string', optional: true },
					{ key: 'weight', type: 'number', optional: true },
					{ key: 'length', type: 'number', optional: true },
					{ key: 'height', type: 'number', optional: true },
					{ key: 'width', type: 'number', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'updateProductVariantsWorkflow',
		label: 'updateProductVariantsWorkflow',
		category: 'Product',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'product_variants',
				type: 'array',
				fields: [
					{ key: 'id', type: 'string' },
					{ key: 'title', type: 'string', optional: true },
					{ key: 'sku', type: 'string', optional: true },
					{ key: 'barcode', type: 'string', optional: true },
					{ key: 'allow_backorder', type: 'boolean', optional: true },
					{ key: 'manage_inventory', type: 'boolean', optional: true },
					{ key: 'weight', type: 'number', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'deleteProductVariantsWorkflow',
		label: 'deleteProductVariantsWorkflow',
		category: 'Product',
		hasAdditionalData: false,
		inputFields: [{ key: 'ids', type: 'array' }]
	},
	{
		name: 'createProductTypesWorkflow',
		label: 'createProductTypesWorkflow',
		category: 'Product',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'product_types',
				type: 'array',
				fields: [
					{ key: 'value', type: 'string' },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'createProductTagsWorkflow',
		label: 'createProductTagsWorkflow',
		category: 'Product',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'product_tags',
				type: 'array',
				fields: [
					{ key: 'value', type: 'string' }
				]
			}
		]
	},
	{
		name: 'createProductCategoriesWorkflow',
		label: 'createProductCategoriesWorkflow',
		category: 'Product',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'product_categories',
				type: 'array',
				fields: [
					{ key: 'name', type: 'string' },
					{ key: 'description', type: 'string', optional: true },
					{ key: 'handle', type: 'string', optional: true },
					{ key: 'is_active', type: 'boolean', optional: true },
					{ key: 'is_internal', type: 'boolean', optional: true },
					{ key: 'rank', type: 'number', optional: true },
					{ key: 'parent_category_id', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	// ─── Inventory ──────────────────────────────────────────────────────────────
	{
		name: 'createInventoryItemsWorkflow',
		label: 'createInventoryItemsWorkflow',
		category: 'Inventory',
		hasAdditionalData: false,
		// key is `items` (not `input`)
		inputFields: [
			{
				key: 'items',
				type: 'array',
				fields: [
					{ key: 'requires_shipping', type: 'boolean' },
					{ key: 'sku', type: 'string', optional: true },
					{ key: 'title', type: 'string', optional: true },
					{ key: 'description', type: 'string', optional: true },
					{ key: 'thumbnail', type: 'string', optional: true },
					{ key: 'weight', type: 'number', optional: true },
					{ key: 'length', type: 'number', optional: true },
					{ key: 'height', type: 'number', optional: true },
					{ key: 'width', type: 'number', optional: true },
					{ key: 'origin_country', type: 'string', optional: true },
					{ key: 'hs_code', type: 'string', optional: true },
					{ key: 'mid_code', type: 'string', optional: true },
					{ key: 'material', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'updateInventoryItemsWorkflow',
		label: 'updateInventoryItemsWorkflow',
		category: 'Inventory',
		hasAdditionalData: false,
		inputFields: [
			{
				key: 'updates',
				type: 'array',
				fields: [
					{ key: 'id', type: 'string' },
					{ key: 'sku', type: 'string', optional: true },
					{ key: 'title', type: 'string', optional: true },
					{ key: 'description', type: 'string', optional: true },
					{ key: 'requires_shipping', type: 'boolean', optional: true },
					{ key: 'weight', type: 'number', optional: true },
					{ key: 'length', type: 'number', optional: true },
					{ key: 'height', type: 'number', optional: true },
					{ key: 'width', type: 'number', optional: true },
					{ key: 'origin_country', type: 'string', optional: true },
					{ key: 'hs_code', type: 'string', optional: true },
					{ key: 'material', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'createInventoryLevelsWorkflow',
		label: 'createInventoryLevelsWorkflow',
		category: 'Inventory',
		hasAdditionalData: false,
		inputFields: [
			{
				key: 'inventory_levels',
				type: 'array',
				fields: [
					{ key: 'inventory_item_id', type: 'string' },
					{ key: 'location_id', type: 'string' },
					{ key: 'stocked_quantity', type: 'number', optional: true },
					{ key: 'incoming_quantity', type: 'number', optional: true }
				]
			}
		]
	},
	// ─── Cart ───────────────────────────────────────────────────────────────────
	{
		name: 'createCartWorkflow',
		label: 'createCartWorkflow',
		category: 'Cart',
		hasAdditionalData: true,
		inputFields: [
			{ key: 'region_id', type: 'string', optional: true },
			{ key: 'customer_id', type: 'string', optional: true },
			{ key: 'sales_channel_id', type: 'string', optional: true },
			{ key: 'email', type: 'string', optional: true },
			{ key: 'currency_code', type: 'string', optional: true },
			{ key: 'shipping_address_id', type: 'string', optional: true },
			{ key: 'billing_address_id', type: 'string', optional: true },
			{ key: 'metadata', type: 'object', optional: true },
			{
				key: 'items',
				type: 'array',
				optional: true,
				fields: [
					{ key: 'variant_id', type: 'string', optional: true },
					{ key: 'quantity', type: 'number' },
					{ key: 'metadata', type: 'object', optional: true }
				]
			},
			{ key: 'promo_codes', type: 'array', optional: true }
		]
	},
	{
		name: 'updateCartWorkflow',
		label: 'updateCartWorkflow',
		category: 'Cart',
		hasAdditionalData: true,
		inputFields: [
			{ key: 'id', type: 'string' },
			{ key: 'region_id', type: 'string', optional: true },
			{ key: 'customer_id', type: 'string', optional: true },
			{ key: 'sales_channel_id', type: 'string', optional: true },
			{ key: 'email', type: 'string', optional: true },
			{ key: 'currency_code', type: 'string', optional: true },
			{ key: 'metadata', type: 'object', optional: true },
			{ key: 'promo_codes', type: 'array', optional: true }
		]
	},
	{
		name: 'addToCartWorkflow',
		label: 'addToCartWorkflow',
		category: 'Cart',
		hasAdditionalData: true,
		inputFields: [
			{ key: 'cart_id', type: 'string' },
			{
				key: 'items',
				type: 'array',
				fields: [
					{ key: 'variant_id', type: 'string', optional: true },
					{ key: 'quantity', type: 'number' },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	// ─── User ───────────────────────────────────────────────────────────────────
	{
		name: 'createUsersWorkflow',
		label: 'createUsersWorkflow',
		category: 'User',
		hasAdditionalData: false,
		// key is `users` (not `usersData`)
		inputFields: [
			{
				key: 'users',
				type: 'array',
				fields: [
					{ key: 'email', type: 'string' },
					{ key: 'first_name', type: 'string', optional: true },
					{ key: 'last_name', type: 'string', optional: true },
					{ key: 'avatar_url', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'updateUsersWorkflow',
		label: 'updateUsersWorkflow',
		category: 'User',
		hasAdditionalData: false,
		inputFields: [
			{
				key: 'updates',
				type: 'array',
				fields: [
					{ key: 'id', type: 'string' },
					{ key: 'first_name', type: 'string', optional: true },
					{ key: 'last_name', type: 'string', optional: true },
					{ key: 'avatar_url', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'deleteUsersWorkflow',
		label: 'deleteUsersWorkflow',
		category: 'User',
		hasAdditionalData: false,
		inputFields: [{ key: 'ids', type: 'array' }]
	},
	// ─── Region ─────────────────────────────────────────────────────────────────
	{
		name: 'createRegionsWorkflow',
		label: 'createRegionsWorkflow',
		category: 'Region',
		hasAdditionalData: false,
		inputFields: [
			{
				key: 'regions',
				type: 'array',
				fields: [
					{ key: 'name', type: 'string' },
					{ key: 'currency_code', type: 'string' },
					{ key: 'countries', type: 'array' },
					{ key: 'automatic_taxes', type: 'boolean', optional: true },
					{ key: 'is_tax_inclusive', type: 'boolean', optional: true },
					{ key: 'payment_providers', type: 'array', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'deleteRegionsWorkflow',
		label: 'deleteRegionsWorkflow',
		category: 'Region',
		hasAdditionalData: false,
		inputFields: [{ key: 'ids', type: 'array' }]
	},
	// ─── Promotions ─────────────────────────────────────────────────────────────
	{
		name: 'createPromotionsWorkflow',
		label: 'createPromotionsWorkflow',
		category: 'Promotions',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'promotionsData',
				type: 'array',
				fields: [
					{ key: 'code', type: 'string' },
					{ key: 'type', type: 'string' },
					{ key: 'status', type: 'string' },
					{ key: 'is_automatic', type: 'boolean', optional: true },
					{ key: 'is_tax_inclusive', type: 'boolean', optional: true },
					{ key: 'limit', type: 'number', optional: true },
					{ key: 'campaign_id', type: 'string', optional: true }
				]
			}
		]
	},
	{
		name: 'updatePromotionsWorkflow',
		label: 'updatePromotionsWorkflow',
		category: 'Promotions',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'promotionsData',
				type: 'array',
				fields: [
					{ key: 'id', type: 'string' },
					{ key: 'code', type: 'string', optional: true },
					{ key: 'type', type: 'string', optional: true },
					{ key: 'status', type: 'string', optional: true },
					{ key: 'is_automatic', type: 'boolean', optional: true },
					{ key: 'limit', type: 'number', optional: true },
					{ key: 'campaign_id', type: 'string', optional: true }
				]
			}
		]
	},
	{
		name: 'deletePromotionsWorkflow',
		label: 'deletePromotionsWorkflow',
		category: 'Promotions',
		hasAdditionalData: false,
		inputFields: [{ key: 'ids', type: 'array' }]
	},
	{
		name: 'createCampaignsWorkflow',
		label: 'createCampaignsWorkflow',
		category: 'Promotions',
		hasAdditionalData: true,
		inputFields: [
			{
				key: 'campaignsData',
				type: 'array',
				fields: [
					{ key: 'name', type: 'string' },
					{ key: 'campaign_identifier', type: 'string' },
					{ key: 'status', type: 'string' },
					{ key: 'description', type: 'string', optional: true },
					{ key: 'starts_at', type: 'string', optional: true },
					{ key: 'ends_at', type: 'string', optional: true }
				]
			}
		]
	},
	// ─── Fulfillment (standalone) ────────────────────────────────────────────────
	{
		name: 'createFulfillmentWorkflow',
		label: 'createFulfillmentWorkflow',
		category: 'Fulfillment',
		hasAdditionalData: false,
		inputFields: [
			{ key: 'location_id', type: 'string' },
			{ key: 'provider_id', type: 'string' },
			{
				key: 'delivery_address',
				type: 'object',
				fields: [
					{ key: 'address_1', type: 'string', optional: true },
					{ key: 'address_2', type: 'string', optional: true },
					{ key: 'city', type: 'string', optional: true },
					{ key: 'country_code', type: 'string', optional: true },
					{ key: 'province', type: 'string', optional: true },
					{ key: 'postal_code', type: 'string', optional: true },
					{ key: 'first_name', type: 'string', optional: true },
					{ key: 'last_name', type: 'string', optional: true },
					{ key: 'company', type: 'string', optional: true },
					{ key: 'phone', type: 'string', optional: true }
				]
			},
			{
				key: 'items',
				type: 'array',
				fields: [
					{ key: 'title', type: 'string' },
					{ key: 'sku', type: 'string' },
					{ key: 'quantity', type: 'number' },
					{ key: 'barcode', type: 'string' },
					{ key: 'line_item_id', type: 'string', optional: true },
					{ key: 'inventory_item_id', type: 'string', optional: true }
				]
			},
			{ key: 'shipping_option_id', type: 'string', optional: true },
			{ key: 'created_by', type: 'string', optional: true },
			{ key: 'metadata', type: 'object', optional: true },
			{
				key: 'labels',
				type: 'array',
				optional: true,
				fields: [
					{ key: 'tracking_number', type: 'string' },
					{ key: 'tracking_url', type: 'string' },
					{ key: 'label_url', type: 'string' }
				]
			}
		]
	},
	{
		name: 'createShipmentWorkflow',
		label: 'createShipmentWorkflow',
		category: 'Fulfillment',
		hasAdditionalData: false,
		inputFields: [
			{ key: 'id', type: 'string' },
			{
				key: 'labels',
				type: 'array',
				fields: [
					{ key: 'tracking_number', type: 'string' },
					{ key: 'tracking_url', type: 'string' },
					{ key: 'label_url', type: 'string' }
				]
			},
			{ key: 'marked_shipped_by', type: 'string', optional: true }
		]
	},
	{
		name: 'cancelFulfillmentWorkflow',
		label: 'cancelFulfillmentWorkflow',
		category: 'Fulfillment',
		hasAdditionalData: false,
		inputFields: [{ key: 'id', type: 'string' }]
	},
	// ─── Sales Channel ──────────────────────────────────────────────────────────
	{
		name: 'createSalesChannelsWorkflow',
		label: 'createSalesChannelsWorkflow',
		category: 'Sales Channel',
		hasAdditionalData: false,
		inputFields: [
			{
				key: 'salesChannelsData',
				type: 'array',
				fields: [
					{ key: 'name', type: 'string' },
					{ key: 'description', type: 'string', optional: true },
					{ key: 'is_disabled', type: 'boolean', optional: true }
				]
			}
		]
	},
	{
		name: 'deleteSalesChannelsWorkflow',
		label: 'deleteSalesChannelsWorkflow',
		category: 'Sales Channel',
		hasAdditionalData: false,
		inputFields: [{ key: 'ids', type: 'array' }]
	},
	// ─── Payment ────────────────────────────────────────────────────────────────
	{
		name: 'capturePaymentWorkflow',
		label: 'capturePaymentWorkflow',
		category: 'Payment',
		hasAdditionalData: false,
		inputFields: [
			{ key: 'payment_id', type: 'string' },
			{ key: 'captured_by', type: 'string', optional: true },
			{ key: 'amount', type: 'number', optional: true }
		]
	},
	{
		name: 'refundPaymentWorkflow',
		label: 'refundPaymentWorkflow',
		category: 'Payment',
		hasAdditionalData: false,
		inputFields: [
			{ key: 'payment_id', type: 'string' },
			{ key: 'created_by', type: 'string', optional: true },
			{ key: 'amount', type: 'number', optional: true },
			{ key: 'note', type: 'string', optional: true },
			{ key: 'refund_reason_id', type: 'string', optional: true }
		]
	},
	// ─── Price Lists ─────────────────────────────────────────────────────────────
	{
		name: 'createPriceListsWorkflow',
		label: 'createPriceListsWorkflow',
		category: 'Price Lists',
		hasAdditionalData: false,
		inputFields: [
			{
				key: 'price_lists_data',
				type: 'array',
				fields: [
					{ key: 'title', type: 'string' },
					{ key: 'description', type: 'string' },
					{ key: 'status', type: 'string', optional: true },
					{ key: 'starts_at', type: 'string', optional: true },
					{ key: 'ends_at', type: 'string', optional: true }
				]
			}
		]
	},
	{
		name: 'deletePriceListsWorkflow',
		label: 'deletePriceListsWorkflow',
		category: 'Price Lists',
		hasAdditionalData: false,
		inputFields: [{ key: 'ids', type: 'array' }]
	},
	// ─── Stock Locations ─────────────────────────────────────────────────────────
	{
		name: 'createStockLocationsWorkflow',
		label: 'createStockLocationsWorkflow',
		category: 'Stock Locations',
		hasAdditionalData: false,
		inputFields: [
			{
				key: 'locations',
				type: 'array',
				fields: [
					{ key: 'name', type: 'string' },
					{ key: 'address_id', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'deleteStockLocationsWorkflow',
		label: 'deleteStockLocationsWorkflow',
		category: 'Stock Locations',
		hasAdditionalData: false,
		inputFields: [{ key: 'ids', type: 'array' }]
	},
	// ─── Return Reasons ──────────────────────────────────────────────────────────
	{
		name: 'createReturnReasonsWorkflow',
		label: 'createReturnReasonsWorkflow',
		category: 'Return Reasons',
		hasAdditionalData: false,
		inputFields: [
			{
				key: 'data',
				type: 'array',
				fields: [
					{ key: 'value', type: 'string' },
					{ key: 'label', type: 'string' },
					{ key: 'description', type: 'string', optional: true },
					{ key: 'parent_return_reason_id', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	// ─── Tax ─────────────────────────────────────────────────────────────────────
	{
		name: 'createTaxRegionsWorkflow',
		label: 'createTaxRegionsWorkflow',
		category: 'Tax',
		hasAdditionalData: false,
		// Takes a raw array (no wrapper key)
		inputFields: [
			{
				key: '(array items)',
				type: 'object',
				fields: [
					{ key: 'country_code', type: 'string' },
					{ key: 'created_by', type: 'string' },
					{ key: 'province_code', type: 'string', optional: true },
					{ key: 'parent_id', type: 'string', optional: true },
					{ key: 'provider_id', type: 'string', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	{
		name: 'createTaxRatesWorkflow',
		label: 'createTaxRatesWorkflow',
		category: 'Tax',
		hasAdditionalData: false,
		inputFields: [
			{
				key: '(array items)',
				type: 'object',
				fields: [
					{ key: 'tax_region_id', type: 'string' },
					{ key: 'name', type: 'string' },
					{ key: 'created_by', type: 'string' },
					{ key: 'rate', type: 'number', optional: true },
					{ key: 'code', type: 'string', optional: true },
					{ key: 'is_default', type: 'boolean', optional: true },
					{ key: 'metadata', type: 'object', optional: true }
				]
			}
		]
	},
	// ─── API Keys ─────────────────────────────────────────────────────────────────
	{
		name: 'createApiKeysWorkflow',
		label: 'createApiKeysWorkflow',
		category: 'API Keys',
		hasAdditionalData: false,
		inputFields: [
			{
				key: 'api_keys',
				type: 'array',
				fields: [
					{ key: 'title', type: 'string' },
					{ key: 'type', type: 'string' },
					{ key: 'created_by', type: 'string' }
				]
			}
		]
	},
	{
		name: 'deleteApiKeysWorkflow',
		label: 'deleteApiKeysWorkflow',
		category: 'API Keys',
		hasAdditionalData: false,
		inputFields: [{ key: 'ids', type: 'array' }]
	}
]

export const MEDUSA_WORKFLOWS_BY_NAME = Object.fromEntries(
	MEDUSA_WORKFLOWS.map(w => [w.name, w])
)

export const MEDUSA_WORKFLOW_CATEGORIES = [...new Set(MEDUSA_WORKFLOWS.map(w => w.category))]

/** Flatten all input field paths for a workflow into dot-notation strings.
 *  e.g. product_variants[].product_id, product_variants[].title, …
 *  Arrays are represented with a [] suffix on the parent key.
 */
export function flattenWorkflowInputPaths(
	fields: WorkflowInputField[],
	prefix = ''
): string[] {
	const paths: string[] = []
	for (const field of fields) {
		const key = prefix ? `${prefix}.${field.key}` : field.key
		if (field.type === 'array') {
			const arrayKey = `${key}[]`
			if (field.fields) {
				// Emit the array parent itself (for whole-array passthrough mappings)
				// and all sub-field paths (for per-field or fan-out mappings)
				paths.push(arrayKey)
				paths.push(...flattenWorkflowInputPaths(field.fields, arrayKey))
			} else {
				paths.push(arrayKey)
			}
		} else if (field.type === 'object' && field.fields) {
			paths.push(key)
			paths.push(...flattenWorkflowInputPaths(field.fields, key))
		} else {
			paths.push(key)
		}
	}
	return paths
}

/** Render the workflow input shape as a human-readable string.
 *  Arrays of objects are shown as:
 *    key: {
 *      nestedField
 *      nestedField2
 *    }[]
 */
export function renderWorkflowInputShape(fields: WorkflowInputField[], indent = 0): string {
	const pad = '  '.repeat(indent)
	const lines: string[] = []
	for (const field of fields) {
		const optMark = field.optional ? '?' : ''
		if (field.type === 'array' && field.fields && field.fields.length > 0) {
			lines.push(`${pad}${field.key}${optMark}: {`)
			lines.push(renderWorkflowInputShape(field.fields, indent + 1))
			lines.push(`${pad}}[]`)
		} else if (field.type === 'object' && field.fields && field.fields.length > 0) {
			lines.push(`${pad}${field.key}${optMark}: {`)
			lines.push(renderWorkflowInputShape(field.fields, indent + 1))
			lines.push(`${pad}}`)
		} else {
			lines.push(`${pad}${field.key}${optMark}: ${field.type}`)
		}
	}
	return lines.join('\n')
}
