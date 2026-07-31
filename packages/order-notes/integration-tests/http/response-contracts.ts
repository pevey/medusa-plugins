/**
 * Response contracts for the order-notes admin API.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the hand-written
 * admin view types in `../../src/admin/types`. Nothing previously verified those
 * hand-written types actually matched what the routes return -- the admin dashboard
 * is bundled by Vite and never typechecked against a real HTTP response, and the
 * test harness fakes the SDK, so it only ever sees fixtures a test author wrote.
 * This module plus the `.parse()` calls in `order-notes.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-order-notes typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in order-notes.spec.ts. A route that
 *                           stops returning a field, or starts returning an extra
 *                           one, fails the parse -- `z.strictObject` rejects unknown
 *                           keys, so both directions are caught, not just missing ones.
 *   3. type <-> components  tsc, via the admin dashboard's own typecheck (not part of
 *                           this file). A view that reads a field the type no longer
 *                           declares fails to compile.
 *
 * A route changing shape fails link 2; "fixing" the schema to match would silently
 * break link 3 for every component reading the removed/changed field, so schema
 * drift is a finding about the TYPE, never a reason to loosen the schema. See
 * task-4c-order-notes-report.md for every mismatch found while building this file
 * and which side was fixed.
 *
 * order-notes has no core-Medusa entity embedded in any response -- `order_id` and
 * `user_id` are plain, unenforced text fields (see the spec file's own top comment),
 * never resolved to an `AdminOrder`/`AdminUser` object -- so this file has no
 * `CoreEntityRef` workaround to carry over from the complaints pilot.
 */
import { z } from '@medusajs/framework/zod'
import type { AdminDeleteOrderNoteResponse, AdminOrderNote, AdminOrderNoteResponse, AdminOrderNotesResponse } from '../../src/admin/types'

// ── Order notes ──────────────────────────────────────────────────────────────

export const AdminOrderNoteSchema = z.strictObject({
	id: z.string(),
	order_id: z.string(),
	user_id: z.string(),
	note: z.string(),
	sent: z.boolean(),
	created_at: z.string(),
	updated_at: z.string(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional()
})
const _noteSchemaMatchesType: AdminOrderNote = {} as z.infer<typeof AdminOrderNoteSchema>
const _noteTypeMatchesSchema: z.infer<typeof AdminOrderNoteSchema> = {} as AdminOrderNote

export const AdminOrderNoteResponseSchema = z.strictObject({
	order_note: AdminOrderNoteSchema
})
const _noteResponseSchemaMatchesType: AdminOrderNoteResponse = {} as z.infer<typeof AdminOrderNoteResponseSchema>
const _noteResponseTypeMatchesSchema: z.infer<typeof AdminOrderNoteResponseSchema> = {} as AdminOrderNoteResponse

export const AdminOrderNotesResponseSchema = z.strictObject({
	order_notes: z.array(AdminOrderNoteSchema),
	count: z.number(),
	limit: z.number(),
	offset: z.number()
})
const _notesResponseSchemaMatchesType: AdminOrderNotesResponse = {} as z.infer<typeof AdminOrderNotesResponseSchema>
const _notesResponseTypeMatchesSchema: z.infer<typeof AdminOrderNotesResponseSchema> = {} as AdminOrderNotesResponse

export const AdminDeleteOrderNoteResponseSchema = z.strictObject({
	deleted: z.array(z.string())
})
const _deleteResponseSchemaMatchesType: AdminDeleteOrderNoteResponse = {} as z.infer<typeof AdminDeleteOrderNoteResponseSchema>
const _deleteResponseTypeMatchesSchema: z.infer<typeof AdminDeleteOrderNoteResponseSchema> = {} as AdminDeleteOrderNoteResponse
