import { FindParams, PaginatedResponse } from '@medusajs/framework/types'
import { InventoryItemDTO, StockLocationDTO } from '@medusajs/types'

export type AdminStockLot = {
	id: string
	inventory_item_id: string
	stock_location_id: string
	lot_number: string
	description?: string | null
	enabled: boolean
	stocked_quantity: number
	created_at?: string
	updated_at?: string
	inventory_item?: InventoryItemDTO
	stock_location?: StockLocationDTO
}

export type AdminSerialNumber = {
	id: string
	value: string
	order_id: string
	created_at: string
}

export type AdminInvalidationReason = {
	id: string
	value: string
	created_at: string
	updated_at: string
}

export interface StockLotQueryParams extends FindParams {}

export type AdminStockLotsResponse = PaginatedResponse<{
	stock_lots: AdminStockLot[]
}>

export type AdminStockLotResponse = {
	stock_lot: AdminStockLot
}

export type AdminSerialNumbersResponse = PaginatedResponse<{
	serial_numbers: AdminSerialNumber[]
}>

export type AdminInvalidationReasonsResponse = PaginatedResponse<{
	invalidation_reasons: AdminInvalidationReason[]
}>

export type AdminInvalidationReasonResponse = {
	invalidation_reason: AdminInvalidationReason
}
