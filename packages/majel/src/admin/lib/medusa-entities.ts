export type MedusaEntity = {
	name: string
	label: string
}

// Queryable Medusa core entities via query.graph({ entity: '...' }).
// Sorted alphabetically by label for display in dropdowns.
export const MEDUSA_ENTITIES: MedusaEntity[] = [
	{ name: 'cart', label: 'Cart' },
	{ name: 'claim', label: 'Claim' },
	{ name: 'customer', label: 'Customer' },
	{ name: 'customer_group', label: 'Customer Group' },
	{ name: 'exchange', label: 'Exchange' },
	{ name: 'fulfillment', label: 'Fulfillment' },
	{ name: 'inventory_item', label: 'Inventory Item' },
	{ name: 'order', label: 'Order' },
	{ name: 'payment_collection', label: 'Payment Collection' },
	{ name: 'price_list', label: 'Price List' },
	{ name: 'product', label: 'Product' },
	{ name: 'product_category', label: 'Product Category' },
	{ name: 'product_collection', label: 'Product Collection' },
	{ name: 'product_variant', label: 'Product Variant' },
	{ name: 'promotion', label: 'Promotion' },
	{ name: 'region', label: 'Region' },
	{ name: 'return', label: 'Return' },
	{ name: 'shipping_option', label: 'Shipping Option' },
	{ name: 'stock_location', label: 'Stock Location' },
	{ name: 'user', label: 'User (Admin)' },
]
