import { AdminProduct, AdminProductVariant, AdminSalesChannel, AdminShippingOption, AdminStockLocation } from '@medusajs/framework/types'

export type AdminSalesChannelWithVeeqo = AdminSalesChannel & {
	// `sales_channel_id` is not requested by any `fields` selection (only
	// `veeqo_channel.veeqo_channel_id` is) but Medusa's query graph always returns a
	// custom link relation's own foreign-key column alongside whatever subfields were
	// asked for -- confirmed against the live API in task-4c-veeqo-report.md.
	veeqo_channel?: { veeqo_channel_id?: number; sales_channel_id?: string }
}

export type AdminSalesChannelsWithVeeqoListResponse = {
	sales_channels: AdminSalesChannelWithVeeqo[]
	limit: number
	offset: number
	count: number
}

export type AdminStockLocationWithVeeqo = AdminStockLocation & {
	// See the comment on `AdminSalesChannelWithVeeqo.veeqo_channel` -- same
	// always-present foreign-key column, here on the warehouse link.
	veeqo_warehouse?: { veeqo_warehouse_id?: number; stock_location_id?: string }
}

export type AdminStockLocationsWithVeeqoListResponse = {
	stock_locations: AdminStockLocationWithVeeqo[]
	limit: number
	offset: number
	count: number
}

export type AdminShippingOptionWithVeeqo = AdminShippingOption & {
	// See the comment on `AdminSalesChannelWithVeeqo.veeqo_channel` -- same
	// always-present foreign-key column, here on the delivery-method link.
	veeqo_delivery_method?: { veeqo_delivery_method_id?: number; shipping_option_id?: string }
}

export type AdminShippingOptionsWithVeeqoListResponse = {
	shipping_options: AdminShippingOptionWithVeeqo[]
	limit: number
	offset: number
	count: number
}

export type AdminProductWithVeeqo = AdminProduct & {
	// See the comment on `AdminSalesChannelWithVeeqo.veeqo_channel` -- same
	// always-present foreign-key column, here on the product link.
	veeqo_product?: { veeqo_product_id?: number; product_id?: string }
}

export type AdminProductWithVeeqoListResponse = {
	products: AdminProductWithVeeqo[]
	limit: number
	offset: number
	count: number
}

export type AdminProductVariantWithVeeqo = AdminProductVariant & {
	product_id: string
	// A relation object always carries its own `id` even when only a subfield (here
	// `title`) is requested -- confirmed against the live API.
	product?: { id?: string; title?: string }
	// See the comment on `AdminSalesChannelWithVeeqo.veeqo_channel` -- same
	// always-present foreign-key column, here on the sellable link.
	veeqo_sellable?: { veeqo_sellable_id?: number; product_variant_id?: string }
}

export type AdminProductVariantsWithVeeqoListResponse = {
	variants: AdminProductVariantWithVeeqo[]
	limit: number
	offset: number
	count: number
}
