import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export const AdminGetOrderNotes = createFindParams({
	limit: 20,
	offset: 0
}).extend({
	order_id: z.string().optional()
})
export type AdminGetOrderNotesType = z.infer<typeof AdminGetOrderNotes>

export const AdminCreateOrderNote = z.object({
	order_id: z.string(),
	note: z.string(),
	sent: z.boolean().default(false),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminCreateOrderNoteType = z.infer<typeof AdminCreateOrderNote>
