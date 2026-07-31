/**
 * Response contracts for the tracing admin API (stock lots, serial numbers,
 * invalidation reasons).
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the hand-written
 * admin view types in `../../src/admin/types`. Nothing previously verified those
 * hand-written types actually matched what the routes return -- the admin dashboard
 * is bundled by Vite and never typechecked against a real HTTP response, and the
 * test harness fakes the SDK, so it only ever sees fixtures a test author wrote.
 * This module plus the `.parse()` calls in `tracing.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-tracing typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in tracing.spec.ts. A route that
 *                           stops returning a field, or starts returning an extra
 *                           one, fails the parse -- `z.strictObject` rejects unknown
 *                           keys, so both directions are caught, not just missing ones.
 *   3. type <-> components  tsc, via the admin dashboard's own typecheck (not part of
 *                           this file). A view that reads a field the type no longer
 *                           declares fails to compile.
 *
 * A route changing shape fails link 2; "fixing" the schema to match would silently
 * break link 3 for every component reading the removed/changed field, so schema
 * drift is a finding about the TYPE (or the route), never a reason to loosen the
 * schema. See task-4c-tracing-report.md for every mismatch found while building this
 * file and which side was fixed.
 *
 * Core-Medusa entities embedded in a response (here: `inventory_item`/`stock_location`,
 * both raw service DTOs from `@medusajs/types` rather than plugin-owned types) are
 * deliberately NOT modelled field-by-field: this file tests THIS plugin's contract,
 * not Medusa's inventory/stock-location modules'. They get the `CoreEntityRef`/
 * `CoreEntitySchema` treatment below, same as the complaints exemplar.
 */
import { z } from '@medusajs/framework/zod'
import type {
	AdminDeleteInvalidationReasonsResponse,
	AdminDeleteSerialNumbersResponse,
	AdminDeleteStockLotsResponse,
	AdminDisableStockLotsResponse,
	AdminEnableStockLotsResponse,
	AdminInvalidationReason,
	AdminInvalidationReasonResponse,
	AdminInvalidationReasonsResponse,
	AdminSerialNumber,
	AdminSerialNumberResponse,
	AdminSerialNumbersResponse,
	AdminStockLot,
	AdminStockLotResponse,
	AdminStockLotsResponse
} from '../../src/admin/types'

// A core-Medusa entity embedded in one of this plugin's responses (here:
// `inventory_item`/`stock_location`, both raw `@medusajs/types` DTOs, not this
// plugin's own admin view types). Only `id` is asserted at runtime --
// `.passthrough()` keeps whatever other keys the route happens to return without
// asserting on them.
//
// The TS-facing type is force-narrowed to `CoreEntityRef` (`{ id: string }`) via
// the `as unknown as` cast below, rather than left as zod's inferred
// `{ id: string; [x: string]: unknown }`. That inferred type carries a string
// index signature, and TypeScript never considers a type WITHOUT an index
// signature -- e.g. the real `InventoryItemDTO`/`StockLocationDTO` -- assignable
// to one that has one, no matter which properties are actually present. Left
// un-narrowed, every two-way assignability const involving an embedded core entity
// fails to compile with a misleading "missing properties" error. Every place this
// file embeds a core entity uses `CoreEntityRef` (via `Omit<..., K> & { [P in K]:
// ... CoreEntityRef ... }`) on BOTH sides of the comparison so the mismatch cancels
// out, leaving the real two-way check to do its job on every field that is
// actually this plugin's contract.
type CoreEntityRef = { id: string }
const CoreEntitySchema = z.object({ id: z.string() }).passthrough() as unknown as z.ZodType<CoreEntityRef>

// ── Stock lots ───────────────────────────────────────────────────────────────

export const AdminStockLotSchema = z.strictObject({
	id: z.string(),
	inventory_item_id: z.string(),
	stock_location_id: z.string(),
	lot_number: z.string(),
	description: z.string().nullable().optional(),
	enabled: z.boolean(),
	stocked_quantity: z.number(),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
	// `inventory_item`/`stock_location` are only populated on the detail route
	// (`GET /admin/stock-lots/:id`, whose middleware always requests
	// `inventory_item.*`/`stock_location.*`) and on the list route when the caller
	// explicitly asks for them (the admin list page does, via `fields=*inventory_item,
	// *stock_location`) -- absent from a plain list response otherwise.
	inventory_item: CoreEntitySchema.optional(),
	stock_location: CoreEntitySchema.optional()
})
// `inventory_item`/`stock_location` are core entities -- reduced to CoreEntityRef on both sides, see above.
type AdminStockLotContract = Omit<AdminStockLot, 'inventory_item' | 'stock_location'> & {
	inventory_item?: CoreEntityRef
	stock_location?: CoreEntityRef
}
const _stockLotSchemaMatchesType: AdminStockLotContract = {} as z.infer<typeof AdminStockLotSchema>
const _stockLotTypeMatchesSchema: z.infer<typeof AdminStockLotSchema> = {} as AdminStockLotContract

export const AdminStockLotResponseSchema = z.strictObject({
	stock_lot: AdminStockLotSchema
})
type AdminStockLotResponseContract = Omit<AdminStockLotResponse, 'stock_lot'> & { stock_lot: AdminStockLotContract }
const _stockLotResponseSchemaMatchesType: AdminStockLotResponseContract = {} as z.infer<typeof AdminStockLotResponseSchema>
const _stockLotResponseTypeMatchesSchema: z.infer<typeof AdminStockLotResponseSchema> = {} as AdminStockLotResponseContract

export const AdminStockLotsResponseSchema = z.strictObject({
	stock_lots: z.array(AdminStockLotSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
type AdminStockLotsResponseContract = Omit<AdminStockLotsResponse, 'stock_lots'> & { stock_lots: AdminStockLotContract[] }
const _stockLotsResponseSchemaMatchesType: AdminStockLotsResponseContract = {} as z.infer<typeof AdminStockLotsResponseSchema>
const _stockLotsResponseTypeMatchesSchema: z.infer<typeof AdminStockLotsResponseSchema> = {} as AdminStockLotsResponseContract

export const AdminDeleteStockLotsResponseSchema = z.strictObject({
	deleted: z.array(z.string())
})
const _deleteStockLotsSchemaMatchesType: AdminDeleteStockLotsResponse = {} as z.infer<typeof AdminDeleteStockLotsResponseSchema>
const _deleteStockLotsTypeMatchesSchema: z.infer<typeof AdminDeleteStockLotsResponseSchema> = {} as AdminDeleteStockLotsResponse

export const AdminEnableStockLotsResponseSchema = z.strictObject({
	enabled: z.array(z.string())
})
const _enableStockLotsSchemaMatchesType: AdminEnableStockLotsResponse = {} as z.infer<typeof AdminEnableStockLotsResponseSchema>
const _enableStockLotsTypeMatchesSchema: z.infer<typeof AdminEnableStockLotsResponseSchema> = {} as AdminEnableStockLotsResponse

export const AdminDisableStockLotsResponseSchema = z.strictObject({
	disabled: z.array(z.string())
})
const _disableStockLotsSchemaMatchesType: AdminDisableStockLotsResponse = {} as z.infer<typeof AdminDisableStockLotsResponseSchema>
const _disableStockLotsTypeMatchesSchema: z.infer<typeof AdminDisableStockLotsResponseSchema> = {} as AdminDisableStockLotsResponse

// ── Serial numbers ───────────────────────────────────────────────────────────

export const AdminSerialNumberSchema = z.strictObject({
	id: z.string(),
	stock_lot_id: z.string(),
	order_id: z.string(),
	value: z.string(),
	invalidated: z.boolean(),
	created_at: z.string(),
	updated_at: z.string()
})
const _serialNumberSchemaMatchesType: AdminSerialNumber = {} as z.infer<typeof AdminSerialNumberSchema>
const _serialNumberTypeMatchesSchema: z.infer<typeof AdminSerialNumberSchema> = {} as AdminSerialNumber

export const AdminSerialNumberResponseSchema = z.strictObject({
	serial_number: AdminSerialNumberSchema
})
const _serialNumberResponseSchemaMatchesType: AdminSerialNumberResponse = {} as z.infer<typeof AdminSerialNumberResponseSchema>
const _serialNumberResponseTypeMatchesSchema: z.infer<typeof AdminSerialNumberResponseSchema> = {} as AdminSerialNumberResponse

// Covers both `GET /admin/serial-numbers` (flat list) and `GET
// /admin/stock-lots/:id/serial-numbers` (scoped to a lot) -- both middlewares now
// request the identical field set (see task-4c-tracing-report.md finding on the
// scoped route under-declaring `stock_lot_id`/`invalidated`), so one schema covers
// both response bodies.
export const AdminSerialNumbersResponseSchema = z.strictObject({
	serial_numbers: z.array(AdminSerialNumberSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _serialNumbersResponseSchemaMatchesType: AdminSerialNumbersResponse = {} as z.infer<typeof AdminSerialNumbersResponseSchema>
const _serialNumbersResponseTypeMatchesSchema: z.infer<typeof AdminSerialNumbersResponseSchema> = {} as AdminSerialNumbersResponse

export const AdminDeleteSerialNumbersResponseSchema = z.strictObject({
	deleted: z.array(z.string())
})
const _deleteSerialNumbersSchemaMatchesType: AdminDeleteSerialNumbersResponse = {} as z.infer<typeof AdminDeleteSerialNumbersResponseSchema>
const _deleteSerialNumbersTypeMatchesSchema: z.infer<typeof AdminDeleteSerialNumbersResponseSchema> = {} as AdminDeleteSerialNumbersResponse

// ── Invalidation reasons ─────────────────────────────────────────────────────

export const AdminInvalidationReasonSchema = z.strictObject({
	id: z.string(),
	value: z.string(),
	created_at: z.string(),
	updated_at: z.string()
})
const _invalidationReasonSchemaMatchesType: AdminInvalidationReason = {} as z.infer<typeof AdminInvalidationReasonSchema>
const _invalidationReasonTypeMatchesSchema: z.infer<typeof AdminInvalidationReasonSchema> = {} as AdminInvalidationReason

export const AdminInvalidationReasonResponseSchema = z.strictObject({
	invalidation_reason: AdminInvalidationReasonSchema
})
const _invalidationReasonResponseSchemaMatchesType: AdminInvalidationReasonResponse = {} as z.infer<typeof AdminInvalidationReasonResponseSchema>
const _invalidationReasonResponseTypeMatchesSchema: z.infer<typeof AdminInvalidationReasonResponseSchema> = {} as AdminInvalidationReasonResponse

export const AdminInvalidationReasonsResponseSchema = z.strictObject({
	invalidation_reasons: z.array(AdminInvalidationReasonSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _invalidationReasonsResponseSchemaMatchesType: AdminInvalidationReasonsResponse = {} as z.infer<typeof AdminInvalidationReasonsResponseSchema>
const _invalidationReasonsResponseTypeMatchesSchema: z.infer<typeof AdminInvalidationReasonsResponseSchema> = {} as AdminInvalidationReasonsResponse

export const AdminDeleteInvalidationReasonsResponseSchema = z.strictObject({
	deleted: z.array(z.string())
})
const _deleteInvalidationReasonsSchemaMatchesType: AdminDeleteInvalidationReasonsResponse = {} as z.infer<typeof AdminDeleteInvalidationReasonsResponseSchema>
const _deleteInvalidationReasonsTypeMatchesSchema: z.infer<typeof AdminDeleteInvalidationReasonsResponseSchema> = {} as AdminDeleteInvalidationReasonsResponse
