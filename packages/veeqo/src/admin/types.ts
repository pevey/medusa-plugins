import {
	AdminProduct,
	AdminProductVariant,
	AdminSalesChannel,
	AdminShippingOption,
	AdminStockLocation
} from '@medusajs/framework/types'

export type AdminSalesChannelWithVeeqo = AdminSalesChannel & {
	veeqo_channel?: { veeqo_channel_id?: string }
}

export type AdminSalesChannelsWithVeeqoListResponse = {
	sales_channels: AdminSalesChannelWithVeeqo[]
	limit: number
	offset: number
	count: number
}

export type AdminStockLocationWithVeeqo = AdminStockLocation & {
	veeqo_warehouse?: { veeqo_warehouse_id?: string }
}

export type AdminStockLocationsWithVeeqoListResponse = {
	stock_locations: AdminStockLocationWithVeeqo[]
	limit: number
	offset: number
	count: number
}

export type AdminShippingOptionWithVeeqo = AdminShippingOption & {
	veeqo_delivery_method?: { veeqo_delivery_method_id?: string }
}

export type AdminShippingOptionsWithVeeqoListResponse = {
	shipping_options: AdminShippingOptionWithVeeqo[]
	limit: number
	offset: number
	count: number
}

export type AdminProductWithVeeqo = AdminProduct & {
	veeqo_product?: { veeqo_product_id?: string }
}

export type AdminProductWithVeeqoListResponse = {
	products: AdminProductWithVeeqo[]
	limit: number
	offset: number
	count: number
}

export type AdminProductVariantWithVeeqo = AdminProductVariant & {
	product_id: string
	product?: { title?: string }
	veeqo_sellable?: { veeqo_sellable_id?: string }
}

export type AdminProductVariantsWithVeeqoListResponse = {
	variants: AdminProductVariantWithVeeqo[]
	limit: number
	offset: number
	count: number
}
