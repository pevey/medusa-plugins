import { z } from '@medusajs/framework/zod'

export const AdminSyncCustomerToVeeqo = z.object({
	customer_ids: z.array(z.string()).min(1, 'At least one Customer ID is required')
})
export type AdminSyncCustomerToVeeqoType = z.infer<typeof AdminSyncCustomerToVeeqo>

export const AdminSyncShippingOptionsToVeeqo = z.object({
	shipping_option_ids: z.array(z.string()).min(1, 'At least one Shipping Option ID is required')
})
export type AdminSyncShippingOptionsToVeeqoType = z.infer<typeof AdminSyncShippingOptionsToVeeqo>

export const AdminSyncOrderToVeeqo = z.object({
	order_ids: z.array(z.string()).min(1, 'At least one Order ID is required')
})
export type AdminSyncOrderToVeeqoType = z.infer<typeof AdminSyncOrderToVeeqo>

export const AdminSyncProductToVeeqo = z.object({
	product_ids: z.array(z.string()).min(1, 'At least one Product ID is required')
})
export type AdminSyncProductToVeeqoType = z.infer<typeof AdminSyncProductToVeeqo>

export const AdminSyncSalesChannelsToVeeqo = z.object({
	sales_channel_ids: z.array(z.string()).min(1, 'At least one Sales Channel ID is required')
})
export type AdminSyncSalesChannelsToVeeqoType = z.infer<typeof AdminSyncSalesChannelsToVeeqo>

export const AdminSyncStockLocationsToVeeqo = z.object({
	stock_location_ids: z.array(z.string()).min(1, 'At least one Stock Location ID is required')
})
export type AdminSyncStockLocationsToVeeqoType = z.infer<typeof AdminSyncStockLocationsToVeeqo>
