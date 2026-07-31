/**
 * Response contracts for the complaints admin API.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the hand-written
 * admin view types in `../../src/admin/types`. Nothing previously verified those
 * hand-written types actually matched what the routes return -- the admin dashboard
 * is bundled by Vite and never typechecked against a real HTTP response, and the
 * test harness fakes the SDK, so it only ever sees fixtures a test author wrote.
 * This module plus the `.parse()` calls in `complaints.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-complaints typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in complaints.spec.ts. A route that
 *                           stops returning a field, or starts returning an extra
 *                           one, fails the parse -- `z.strictObject` rejects unknown
 *                           keys, so both directions are caught, not just missing ones.
 *   3. type <-> components  tsc, via the admin dashboard's own typecheck (not part of
 *                           this file). A view that reads a field the type no longer
 *                           declares fails to compile.
 *
 * A route changing shape fails link 2; "fixing" the schema to match would silently
 * break link 3 for every component reading the removed/changed field, so schema
 * drift is a finding about the TYPE (and by extension the components that read it),
 * never a reason to loosen the schema. See task-4b-report.md for every mismatch
 * found while building this file and which side was fixed.
 *
 * Core-Medusa entities embedded in a response (customer/order/product/user) are
 * deliberately NOT modelled field-by-field: this file tests THIS plugin's contract,
 * not Medusa's. They get `z.object({ id: z.string() }).passthrough()`.
 */
import { z } from '@medusajs/framework/zod'
import type {
	AdminComplaint,
	AdminComplaintActivity,
	AdminComplaintActivityResponse,
	AdminComplaintDocument,
	AdminComplaintDocumentDownloadResponse,
	AdminComplaintDocumentResponse,
	AdminComplaintDocumentsResponse,
	AdminComplaintResponse,
	AdminComplaintsResponse,
	AdminComplaintTag,
	AdminComplaintTagResponse,
	AdminComplaintTagsResponse,
	ComplaintProductStat
} from '../../src/admin/types'

// A core-Medusa entity embedded in one of this plugin's responses (AdminCustomer,
// AdminOrder, AdminProduct, AdminUser). Only `id` is asserted at runtime --
// `.passthrough()` keeps whatever other keys the route happens to return without
// asserting on them.
//
// The TS-facing type is force-narrowed to `CoreEntityRef` (`{ id: string }`) via
// the `as unknown as` cast below, rather than left as zod's inferred
// `{ id: string; [x: string]: unknown }`. That inferred type carries a string
// index signature, and TypeScript never considers a type WITHOUT an index
// signature -- e.g. the real `AdminCustomer`/`AdminOrder`/`AdminProduct`/`AdminUser`
// -- assignable to one that has one, no matter which properties are actually
// present. Left un-narrowed, every two-way assignability const involving an
// embedded core entity fails to compile with a misleading "missing properties"
// error. Every place this file embeds a core entity uses `CoreEntityRef` (via
// `Omit<..., K> & { [P in K]: ... CoreEntityRef ... }`) on BOTH sides of the
// comparison so the mismatch cancels out, leaving the real two-way check to do
// its job on every field that is actually this plugin's contract.
type CoreEntityRef = { id: string }
const CoreEntitySchema = z.object({ id: z.string() }).passthrough() as unknown as z.ZodType<CoreEntityRef>

// ── Complaint tags ───────────────────────────────────────────────────────────

export const AdminComplaintTagSchema = z.strictObject({
	id: z.string(),
	value: z.string(),
	created_at: z.string(),
	updated_at: z.string()
})
const _tagSchemaMatchesType: AdminComplaintTag = {} as z.infer<typeof AdminComplaintTagSchema>
const _tagTypeMatchesSchema: z.infer<typeof AdminComplaintTagSchema> = {} as AdminComplaintTag

export const AdminComplaintTagResponseSchema = z.strictObject({
	complaint_tag: AdminComplaintTagSchema
})
const _tagResponseSchemaMatchesType: AdminComplaintTagResponse = {} as z.infer<typeof AdminComplaintTagResponseSchema>
const _tagResponseTypeMatchesSchema: z.infer<typeof AdminComplaintTagResponseSchema> = {} as AdminComplaintTagResponse

export const AdminComplaintTagsResponseSchema = z.strictObject({
	complaint_tags: z.array(AdminComplaintTagSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _tagsResponseSchemaMatchesType: AdminComplaintTagsResponse = {} as z.infer<typeof AdminComplaintTagsResponseSchema>
const _tagsResponseTypeMatchesSchema: z.infer<typeof AdminComplaintTagsResponseSchema> = {} as AdminComplaintTagsResponse

// ── Complaint activities ─────────────────────────────────────────────────────

export const AdminComplaintActivitySchema = z.strictObject({
	id: z.string(),
	complaint_id: z.string(),
	user_id: z.string(),
	type: z.enum(['open', 'close', 'note']),
	note: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	created_at: z.string(),
	updated_at: z.string(),
	user: CoreEntitySchema
})
// `user` is a core entity (AdminUser) -- reduced to CoreEntityRef on both sides, see above.
type AdminComplaintActivityContract = Omit<AdminComplaintActivity, 'user'> & { user: CoreEntityRef }
const _activitySchemaMatchesType: AdminComplaintActivityContract = {} as z.infer<typeof AdminComplaintActivitySchema>
const _activityTypeMatchesSchema: z.infer<typeof AdminComplaintActivitySchema> = {} as AdminComplaintActivityContract

export const AdminComplaintActivityResponseSchema = z.strictObject({
	activities: z.array(AdminComplaintActivitySchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
type AdminComplaintActivityResponseContract = Omit<AdminComplaintActivityResponse, 'activities'> & { activities: AdminComplaintActivityContract[] }
const _activityResponseSchemaMatchesType: AdminComplaintActivityResponseContract = {} as z.infer<typeof AdminComplaintActivityResponseSchema>
const _activityResponseTypeMatchesSchema: z.infer<typeof AdminComplaintActivityResponseSchema> = {} as AdminComplaintActivityResponseContract

// ── Complaint documents ──────────────────────────────────────────────────────

export const AdminComplaintDocumentSchema = z.strictObject({
	id: z.string(),
	complaint_id: z.string(),
	filename: z.string(),
	mime_type: z.string(),
	size_bytes: z.number(),
	uploaded_by: z.string().nullable(),
	created_at: z.string()
})
const _documentSchemaMatchesType: AdminComplaintDocument = {} as z.infer<typeof AdminComplaintDocumentSchema>
const _documentTypeMatchesSchema: z.infer<typeof AdminComplaintDocumentSchema> = {} as AdminComplaintDocument

export const AdminComplaintDocumentResponseSchema = z.strictObject({
	document: AdminComplaintDocumentSchema
})
const _documentResponseSchemaMatchesType: AdminComplaintDocumentResponse = {} as z.infer<typeof AdminComplaintDocumentResponseSchema>
const _documentResponseTypeMatchesSchema: z.infer<typeof AdminComplaintDocumentResponseSchema> = {} as AdminComplaintDocumentResponse

export const AdminComplaintDocumentsResponseSchema = z.strictObject({
	documents: z.array(AdminComplaintDocumentSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _documentsResponseSchemaMatchesType: AdminComplaintDocumentsResponse = {} as z.infer<typeof AdminComplaintDocumentsResponseSchema>
const _documentsResponseTypeMatchesSchema: z.infer<typeof AdminComplaintDocumentsResponseSchema> = {} as AdminComplaintDocumentsResponse

export const AdminComplaintDocumentDownloadResponseSchema = z.strictObject({
	url: z.string(),
	filename: z.string(),
	mime_type: z.string()
})
const _documentDownloadResponseSchemaMatchesType: AdminComplaintDocumentDownloadResponse = {} as z.infer<typeof AdminComplaintDocumentDownloadResponseSchema>
const _documentDownloadResponseTypeMatchesSchema: z.infer<typeof AdminComplaintDocumentDownloadResponseSchema> = {} as AdminComplaintDocumentDownloadResponse

// ── Complaint product stats ──────────────────────────────────────────────────

export const ComplaintProductStatSchema = z.strictObject({
	id: z.string(),
	product_id: z.string(),
	total_orders: z.number(),
	total_complaints: z.number(),
	complaint_rate: z.number(),
	last_calculated_at: z.string().nullable()
})
const _productStatSchemaMatchesType: ComplaintProductStat = {} as z.infer<typeof ComplaintProductStatSchema>
const _productStatTypeMatchesSchema: z.infer<typeof ComplaintProductStatSchema> = {} as ComplaintProductStat

// ── Complaints ────────────────────────────────────────────────────────────────

export const AdminComplaintSchema = z.strictObject({
	id: z.string(),
	number: z.number(),
	status: z.enum(['open', 'closed']),
	description: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	customer_id: z.string(),
	// Optional: a `readOnly` module link keyed on a plain-text id with no FK
	// enforcement. When the id doesn't resolve to a live customer, the graph
	// query omits the key entirely rather than returning a stub -- confirmed via
	// this suite's own fake customer_id fixtures. See the note on the type.
	customer: CoreEntitySchema.optional(),
	order_id: z.string().nullable(),
	order: CoreEntitySchema.nullable().optional(),
	product_id: z.string().nullable(),
	product: CoreEntitySchema.nullable().optional(),
	stock_lot_id: z.string().nullable(),
	serial_number_id: z.string().nullable(),
	actionable: z.boolean(),
	reportable: z.boolean(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	tags: z.array(AdminComplaintTagSchema).optional()
})
// `customer`/`order`/`product` are core entities -- reduced to CoreEntityRef on both sides, see above.
type AdminComplaintContract = Omit<AdminComplaint, 'customer' | 'order' | 'product'> & {
	customer?: CoreEntityRef
	order?: CoreEntityRef | null
	product?: CoreEntityRef | null
}
const _complaintSchemaMatchesType: AdminComplaintContract = {} as z.infer<typeof AdminComplaintSchema>
const _complaintTypeMatchesSchema: z.infer<typeof AdminComplaintSchema> = {} as AdminComplaintContract

export const AdminComplaintResponseSchema = z.strictObject({
	complaint: AdminComplaintSchema
})
type AdminComplaintResponseContract = Omit<AdminComplaintResponse, 'complaint'> & { complaint: AdminComplaintContract }
const _complaintResponseSchemaMatchesType: AdminComplaintResponseContract = {} as z.infer<typeof AdminComplaintResponseSchema>
const _complaintResponseTypeMatchesSchema: z.infer<typeof AdminComplaintResponseSchema> = {} as AdminComplaintResponseContract

export const AdminComplaintsResponseSchema = z.strictObject({
	complaints: z.array(AdminComplaintSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
type AdminComplaintsResponseContract = Omit<AdminComplaintsResponse, 'complaints'> & { complaints: AdminComplaintContract[] }
const _complaintsResponseSchemaMatchesType: AdminComplaintsResponseContract = {} as z.infer<typeof AdminComplaintsResponseSchema>
const _complaintsResponseTypeMatchesSchema: z.infer<typeof AdminComplaintsResponseSchema> = {} as AdminComplaintsResponseContract
