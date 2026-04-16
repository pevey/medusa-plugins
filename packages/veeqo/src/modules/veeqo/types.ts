export type VeeqoOptions = {
	apiKey: string
	timeout: number
	retry: number
	headers?: Record<string, string>
	veeqoUrl?: string
}

export type CustomerForVeeqoCustomerInput = {
	id: string
	email?: string | null
	phone?: string | null
	veeqo_customer?: {
		veeqo_customer_id?: number | null
	} | null
}

export type OrderForVeeqoOrderInput = {
	id: string
	discount_total?: number | null
	shipping_address?: {
		first_name?: string | null
		last_name?: string | null
		address_1?: string | null
		address_2?: string | null
		city?: string | null
		province?: string | null
		country_code?: string | null
		postal_code?: string | null
		phone?: string | null
	} | null
	customer?: {
		id: string
		email?: string | null
		phone?: string | null
		veeqo_customer?: {
			veeqo_customer_id?: number | null
		} | null
	} | null
	items?:
		| {
				id: string
				unit_price: number
				quantity: number
				discount_total?: number | null
				variant?: {
					id?: string | null
					veeqo_sellable?: {
						veeqo_sellable_id?: number | string | null
					} | null
				} | null
		  }[]
		| null
	sales_channel?: {
		id: string
		veeqo_channel?: {
			veeqo_channel_id?: number | null
		} | null
	} | null
	shipping_methods?:
		| {
				id: string
				amount?: number | null
				shipping_option?: {
					id: string
					veeqo_delivery_method?: {
						veeqo_delivery_method_id?: number | null
					} | null
				} | null
		  }[]
		| null
	payment_collections?:
		| {
				id: string
				payment_sessions?:
					| {
							id: string
							provider_id?: string | null
					  }[]
					| null
		  }[]
		| null
	veeqo_order?: {
		veeqo_order_id?: number | null
	} | null
}

export type ProductVariantForVeeqoProductInput = {
	id: string
	title?: string | null
	sku?: string | null
	prices?:
		| {
				amount?: number | null
		  }[]
		| null
	veeqo_sellable?: {
		veeqo_sellable_id?: number | string | null
	} | null
}

export type ProductForVeeqoProductInput = {
	id: string
	title?: string | null
	thumbnail?: string | null
	weight?: number | null
	variants?: ProductVariantForVeeqoProductInput[] | null
	veeqo_product?: {
		veeqo_product_id?: number | null
	} | null
}

export type SalesChannelForVeeqoChannelInput = {
	id: string
	name: string | null
	veeqo_channel?: {
		veeqo_channel_id?: number | null
	} | null
	default_warehouse_id?: number | null
}

export type ShippingOptionForVeeqoDeliveryMethodInput = {
	id: string
	name?: string | null
	prices?:
		| {
				amount?: number | null
		  }[]
		| null
	veeqo_delivery_method?: {
		veeqo_delivery_method_id?: number | null
	} | null
}

export type StockLocationForVeeqoWarehouseInput = {
	id: string
	name: string
	address?: {
		address_1?: string | null
		city?: string | null
		province?: string | null
		country_code?: string | null
		postal_code?: string | null
	} | null
	veeqo_warehouse?: {
		veeqo_warehouse_id: number
	} | null
}

// See list at https://github.com/VeeqoAPI/api-docs/blob/master/resources/references/order_statuses.json
export type VeeqoStatus =
	| null
	| 'awaiting_payment'
	| 'awaiting_stock'
	| 'awaiting_fulfillment'
	| 'awaiting_amazon_stock'
	| 'shipped'
	| 'on_hold'
	| 'cancelled'
	| 'refunded'

export interface VeeqoChannelDTO {
	id: number
	name: string
	type_code: string
}

export interface VeeqoChannelInput {
	name: string
	type_code: string
	default_warehouse_id?: number // GET /admin/stores/{id} returns object with default_location_id
}

export interface VeeqoCustomerInput {
	email: string
	notes: string // used for storing the Medusa customer ID
	phone?: string
}

export interface VeeqoCustomerDTO {
	id: number
	notes: string // used for storing the Medusa customer ID
}

export interface VeeqoDeliveryMethodDTO {
	id: number
	name: string
}

export interface VeeqoDeliveryMethodInput {
	name: string
	cost: number
}

export interface VeeqoOrderDTO {
	id: number
	status: VeeqoStatus
	shipped_at: string | null
	can_be_shipped: boolean
	allocated_completely: boolean
	allocations: VeeqoAllocation[] | null
}

export interface VeeqoOrderInput {
	channel_id: number
	customer_id: number
	deliver_to_attributes: VeeqoAddress
	delivery_method_id: number
	number: string // Use this field to store the Medusa order_id
	send_notification_email: boolean
	total_discounts?: number
	line_items_attributes: {
		sellable_id: number
		price_per_unit: number
		quantity: number
		tax_rate?: number
		taxless_discount_per_unit?: number
	}[]
	payment_attributes: {
		payment_type: string
		reference_number: string
	}
	tags?: string[]
}

export interface VeeqoProductDTO {
	id: number
	notes: string // used for storing the Medusa product ID
	title: string
	sellables: VeeqoSellableDTO[]
}

export interface VeeqoProductInput {
	title: string
	notes: string // used for storing the Medusa product ID
	images_attributes?: {
		src: string
		display_position: number
	}[]
	product_variants_attributes: VeeqoSellableInput[]
}

export interface VeeqoSellableDTO {
	id: number
	sku_code: string
	inventory: {
		infinite: boolean
	}
}

export interface VeeqoSellableInput {
	id?: number
	title: string
	price: number
	sku_code: string
	weight: number
}

export interface VeeqoShipmentDTO {
	id: number
	created_at: string
	updated_at: string
	tracking_number: VeeqoTrackingNumber | null
	tracking_url: string | null
	carrier: VeeqoCarrier
	shipped_by: VeeqoShippedBy
}

export interface VeeqoTrackingEventDTO {
	id: number
	timestamp: string
	description: string
	detail: string | null
	location: string | null
	status: string
}

export interface VeeqoWarehouseDTO {
	id: number
	name: string
}

export interface VeeqoWarehouseInput {
	name: string
	address_line_1: string
	city: string
	region: string
	country: string
	post_code: string
}

//--------------------------------------------------------------

export interface VeeqoAddress {
	first_name: string
	last_name: string
	email: string
	address1: string
	address2?: string
	city: string
	state: string
	country: string
	zip: string
	phone?: string
}

export interface VeeqoAllocation {
	id: number
	line_items: {
		id: number
		sellable: {
			id: number
		}
		quantity: number
	}[]
	shipment: VeeqoShipmentDTO | null
}

export interface VeeqoCarrier {
	id: number
	name: string
	slug: string
}

export type VeeqoShippedBy = {
	id: number
	name: string
	email: string
}

export interface VeeqoStockEntryInput {
	physical_stock_level: number
	infinite: boolean
}

export interface VeeqoTrackingNumber {
	id: number
	tracking_number: string
	tracking_url: string | null
	created_at: string
	updated_at: string
	collected_at: string
	delivered_at: string
	delivered_to_a_secure_location_at: string
	in_clearance_at: string
	in_transit_at: string
	out_for_delivery_at: string
	attempted_delivery_at: string
	collect_from_depot_at: string
	notified_recipient_at: string
	delayed_at: string
	cancelled_at: string
	contact_support_at: string
	recipient_refused_at: string
	returned_to_sender_at: string
	status: string
}
