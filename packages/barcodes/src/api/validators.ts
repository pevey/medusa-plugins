import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export const AdminGetBarcode = createFindParams()
export type AdminGetBarcodeType = z.infer<typeof AdminGetBarcode>

export const AdminGetBarcodes = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	q: z.string().optional()
})
export type AdminGetBarcodesType = z.infer<typeof AdminGetBarcodes>

export const AdminCreateBarcode = z.object({
	url: z.string(),
	metadata: z.record(z.unknown()).nullable().optional()
})
export type AdminCreateBarcodeType = z.infer<typeof AdminCreateBarcode>

export const AdminDeleteBarcodes = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteBarcodesType = z.infer<typeof AdminDeleteBarcodes>

export const AdminUpdateBarcode = z
	.object({
		url: z.string().optional(),
		metadata: z.record(z.unknown()).nullable().optional()
	})
	.passthrough()
export type AdminUpdateBarcodeType = z.infer<typeof AdminUpdateBarcode>

export const AdminRenderBarcode = z.object({
	bcid: z.string().optional(), // Barcode type
	text: z.string().optional(), // Barcode value
	gtin: z.string().optional(),
	serial: z.string().optional(),
	height: z.preprocess(
		val => (val === '' || val == null ? undefined : val),
		z.coerce.number().int().optional()
	), // Barcode height, in mm
	width: z.preprocess(val => {
		return val && typeof val === 'string' ? parseInt(val) : val
	}, z.number().optional()), // Barcode width, in mm
	parsefnc: z.preprocess(val => {
		return val && typeof val === 'string' ? Boolean(val) : val
	}, z.boolean().optional()) // Whether to parse the barcode value as a function code (e.g., for GS1 barcodes)
})
export type AdminRenderBarcodeType = z.infer<typeof AdminRenderBarcode>
