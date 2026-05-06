import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export const AdminGetStockLots = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	inventory_item_id: z.string().optional(),
	stock_location_id: z.string().optional(),
	enabled: z
		.preprocess(val => {
			if (val === 'true') return true
			if (val === 'false') return false
			return val
		}, z.boolean())
		.optional(),
	q: z.string().optional()
})
export type AdminGetStockLotsType = z.infer<typeof AdminGetStockLots>

export const AdminGetStockLot = createFindParams()
export type AdminGetStockLotType = z.infer<typeof AdminGetStockLot>

export const AdminCreateStockLot = z
	.object({
		inventory_item_id: z.string(),
		stock_location_id: z.string(),
		lot_number: z.string(),
		description: z.string().nullable().optional(),
		enabled: z.boolean().default(true),
		initial_quantity: z.number().optional(),
		stocked_quantity: z.number().optional(),
		metadata: z.record(z.string(), z.unknown()).nullable().optional()
	})
	.check((ctx) => {
		const val = ctx.value
		if (val.initial_quantity === undefined && val.stocked_quantity === undefined) {
			ctx.issues.push({
				path: ['initial_quantity', 'stocked_quantity'],
				code: 'custom',
				input: val,
				message: 'Either initial_quantity or stocked_quantity must be provided'
			})
		} else if (
			val.initial_quantity !== undefined &&
			val.stocked_quantity !== undefined &&
			val.initial_quantity !== val.stocked_quantity
		) {
			ctx.issues.push({
				path: ['initial_quantity', 'stocked_quantity'],
				code: 'custom',
				input: val,
				message: 'initial_quantity and stocked_quantity must be equal'
			})
		} else if (
			val.initial_quantity === undefined &&
			val.stocked_quantity !== undefined &&
			val.stocked_quantity > 0
		) {
			val.initial_quantity = val.stocked_quantity
		} else if (
			val.stocked_quantity === undefined &&
			val.initial_quantity !== undefined &&
			val.initial_quantity > 0
		) {
			val.stocked_quantity = val.initial_quantity
		}
	})
export type AdminCreateStockLotType = z.infer<typeof AdminCreateStockLot>

export const AdminDeleteStockLots = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteStockLotsType = z.infer<typeof AdminDeleteStockLots>

export const AdminUpdateStockLot = z.object({
	inventory_item_id: z.string().optional(),
	stock_location_id: z.string().optional(),
	lot_number: z.string().optional(),
	description: z.string().nullable().optional(),
	enabled: z.boolean().optional(),
	stocked_quantity: z.number().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminUpdateStockLotType = z.infer<typeof AdminUpdateStockLot>

export const AdminGetSerialNumbers = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	stock_lot_id: z.string().optional(),
	order_id: z.string().optional(),
	invalidated: z
		.preprocess(val => {
			if (val === 'true') return true
			if (val === 'false') return false
			return val
		}, z.boolean())
		.optional(),
	q: z.string().optional()
})
export type AdminGetSerialNumbersType = z.infer<typeof AdminGetSerialNumbers>

export const AdminGetSerialNumber = createFindParams()
export type AdminGetSerialNumberType = z.infer<typeof AdminGetSerialNumber>

export const AdminCreateSerialNumber = z.object({
	order_id: z.string(),
	stock_lot_id: z.string(),
	value: z.string(),
	invalidated: z.boolean().default(false),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminCreateSerialNumberType = z.infer<typeof AdminCreateSerialNumber>

export const AdminDeleteSerialNumbers = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteSerialNumbersType = z.infer<typeof AdminDeleteSerialNumbers>

export const AdminUpdateSerialNumber = z.object({
	order_id: z.string().optional(),
	stock_lot_id: z.string().optional(),
	value: z.string().optional(),
	invalidated: z.boolean().default(false),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminUpdateSerialNumberType = z.infer<typeof AdminUpdateSerialNumber>

export const AdminGetInvalidationReason = createFindParams()
export type AdminGetInvalidationReasonType = z.infer<typeof AdminGetInvalidationReason>

export const AdminGetInvalidationReasons = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	q: z.string().optional()
})
export type AdminGetInvalidationReasonsType = z.infer<typeof AdminGetInvalidationReasons>

export const AdminCreateInvalidationReason = z.object({
	value: z.string(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminCreateInvalidationReasonType = z.infer<typeof AdminCreateInvalidationReason>

export const AdminDeleteInvalidationReasons = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteInvalidationReasonsType = z.infer<typeof AdminDeleteInvalidationReasons>

export const AdminUpdateInvalidationReason = z.object({
	value: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminUpdateInvalidationReasonType = z.infer<typeof AdminUpdateInvalidationReason>
