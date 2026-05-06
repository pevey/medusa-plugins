import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'
import { ComplaintStatus } from '../modules/complaint/models/complaint'
import { ComplaintActivityType } from '../modules/complaint/models/complaint-activity'

// ── Complaints ────────────────────────────────────────────────────────────────

export const AdminGetComplaints = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	customer_id: z.string().optional(),
	order_id: z.string().optional(),
	product_id: z.string().optional(),
	stock_lot_id: z.string().optional(),
	serial_number_id: z.string().optional(),
	status: z
		.preprocess(val => {
			if (val === 'open') return ComplaintStatus.OPEN
			if (val === 'closed') return ComplaintStatus.CLOSED
			return val
		}, z.enum(ComplaintStatus))
		.optional(),
	q: z.string().optional()
})
export type AdminGetComplaintsType = z.infer<typeof AdminGetComplaints>

export const AdminGetComplaint = createFindParams()
export type AdminGetComplaintType = z.infer<typeof AdminGetComplaint>

export const AdminCreateComplaint = z
	.object({
		description: z.string(),
		customer_id: z.string(),
		order_id: z.string(),
		product_id: z.string(),
		stock_lot_id: z.string().optional(),
		serial_number_id: z.string().optional(),
		tag_ids: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
		metadata: z.record(z.string(), z.unknown()).nullable().optional()
	})
	.check((ctx) => {
		const val = ctx.value
		if (val.tag_ids && val.tags) {
			// If both tag_ids and tags are provided, combine them and remove duplicates
			const combinedTags = Array.from(new Set([...val.tag_ids, ...(val.tags || [])]))
			val.tag_ids = combinedTags
			delete val.tags
		} else if (val.tag_ids && !val.tags) {
			val.tags = val.tag_ids
			delete val.tag_ids
		}
	})
export type AdminCreateComplaintType = z.infer<typeof AdminCreateComplaint>

export const AdminDeleteComplaints = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteComplaintsType = z.infer<typeof AdminDeleteComplaints>

export const AdminUpdateComplaint = z
	.object({
		number: z.number().optional(),
		status: z
			.preprocess(val => {
				if (val === 'open') return ComplaintStatus.OPEN
				if (val === 'closed') return ComplaintStatus.CLOSED
				return val
			}, z.enum(ComplaintStatus))
			.optional(),
		description: z.string().optional(),
		customer_id: z.string().optional(),
		order_id: z.string().optional(),
		product_id: z.string().optional(),
		stock_lot_id: z.string().optional(),
		serial_number_id: z.string().optional(),
		tag_ids: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
		metadata: z.record(z.string(), z.unknown()).nullable().optional()
	})
	.check((ctx) => {
		const val = ctx.value
		if (val.tag_ids && val.tags) {
			// If both tag_ids and tags are provided, combine them and remove duplicates
			const combinedTags = Array.from(new Set([...val.tag_ids, ...(val.tags || [])]))
			val.tag_ids = combinedTags
			delete val.tags
		} else if (val.tag_ids && !val.tags) {
			val.tags = val.tag_ids
			delete val.tag_ids
		}
	})
export type AdminUpdateComplaintType = z.infer<typeof AdminUpdateComplaint>

// ── Complaint Tags ────────────────────────────────────────────────────────────

export const AdminGetComplaintTag = createFindParams()
export type AdminGetComplaintTagType = z.infer<typeof AdminGetComplaintTag>

export const AdminGetComplaintTags = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	q: z.string().optional()
})
export type AdminGetComplaintTagsType = z.infer<typeof AdminGetComplaintTags>

export const AdminCreateComplaintTag = z.object({
	value: z.string(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminCreateComplaintTagType = z.infer<typeof AdminCreateComplaintTag>

export const AdminDeleteComplaintTags = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteComplaintTagsType = z.infer<typeof AdminDeleteComplaintTags>

export const AdminUpdateComplaintTag = z.object({
	value: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
export type AdminUpdateComplaintTagType = z.infer<typeof AdminUpdateComplaintTag>

export const AdminAddComplaintTag = z
	.object({
		tag_id: z.string().optional(),
		tag: z.string().optional()
	})
	.check((ctx) => {
		const val = ctx.value
		if (val.tag && val.tag_id) {
			ctx.issues.push({
				path: ['tag', 'tag_id'],
				code: 'custom',
				input: val,
				message: 'Only one of tag or tag_id can be provided'
			})
		} else if (!val.tag && !val.tag_id) {
			ctx.issues.push({
				path: ['tag', 'tag_id'],
				code: 'custom',
				input: val,
				message: 'Either tag or tag_id must be provided'
			})
		} else if (val.tag_id && !val.tag) {
			val.tag = val.tag_id
			delete val.tag_id
		}
	})
export type AdminAddComplaintTagType = z.infer<typeof AdminAddComplaintTag>

// ── Complaint Activity ────────────────────────────────────────────────────────

export const AdminGetComplaintActivity = createFindParams()
export type AdminGetComplaintActivityType = z.infer<typeof AdminGetComplaintActivity>

export const AdminGetComplaintActivities = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	q: z.string().optional()
})
export type AdminGetComplaintActivitiesType = z.infer<typeof AdminGetComplaintActivities>

export const AdminCreateComplaintActivity = z.object({
	type: z
		.preprocess(val => {
			if (val === 'open') return ComplaintActivityType.OPEN
			if (val === 'close') return ComplaintActivityType.CLOSE
			if (val === 'note') return ComplaintActivityType.NOTE
			return val
		}, z.enum(ComplaintActivityType))
		.default(ComplaintActivityType.NOTE),
	note: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
})
export type AdminCreateComplaintActivityType = z.infer<typeof AdminCreateComplaintActivity>

export const AdminCreateComplaintNote = z.object({
	note: z.string()
})
export type AdminCreateComplaintNoteType = z.infer<typeof AdminCreateComplaintNote>

export const AdminUpdateComplaintNote = z.object({
	note: z.string()
})
export type AdminUpdateComplaintNoteType = z.infer<typeof AdminUpdateComplaintNote>

export const AdminDeleteComplaintActivities = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteComplaintActivitiesType = z.infer<typeof AdminDeleteComplaintActivities>

export const AdminUpdateComplaintActivity = z.object({
	type: z
		.preprocess(val => {
			if (val === 'open') return ComplaintActivityType.OPEN
			if (val === 'close') return ComplaintActivityType.CLOSE
			if (val === 'note') return ComplaintActivityType.NOTE
			return val
		}, z.enum(ComplaintActivityType))
		.optional(),
	note: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
})
export type AdminUpdateComplaintActivityType = z.infer<typeof AdminUpdateComplaintActivity>

// ── Complaint Stats ───────────────────────────────────────────────────────────

export const AdminGetComplaintStat = createFindParams()
export type AdminGetComplaintStatType = z.infer<typeof AdminGetComplaintStat>

export const AdminGetComplaintProductStats = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	product_id: z.string().optional()
})
export type AdminGetComplaintProductStatsType = z.infer<typeof AdminGetComplaintProductStats>

export const AdminGetComplaintProductStat = createFindParams()
export type AdminGetComplaintProductStatType = z.infer<typeof AdminGetComplaintProductStat>

export const AdminGetComplaintTagStats = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	tag_id: z.string().optional()
})
export type AdminGetComplaintTagStatsType = z.infer<typeof AdminGetComplaintTagStats>

export const AdminGetComplaintStockLotStats = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	stock_lot_id: z.string().optional()
})
export type AdminGetComplaintStockLotStatsType = z.infer<typeof AdminGetComplaintStockLotStats>

export const AdminGetComplaintStockLocationStats = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	stock_location_id: z.string().optional()
})
export type AdminGetComplaintStockLocationStatsType = z.infer<
	typeof AdminGetComplaintStockLocationStats
>

export const AdminGetComplaintCustomerTagStats = createFindParams({
	limit: 15,
	offset: 0
}).extend({
	customer_tag_id: z.string().optional()
})
export type AdminGetComplaintCustomerTagStatsType = z.infer<
	typeof AdminGetComplaintCustomerTagStats
>
