/**
 * Response contracts for the customer-tags admin API.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the hand-written
 * admin view types in `../../src/admin/types`. Nothing previously verified those
 * hand-written types actually matched what the routes return -- the admin dashboard
 * is bundled by Vite and never typechecked against a real HTTP response, and the
 * test harness fakes the SDK, so it only ever sees fixtures a test author wrote.
 * This module plus the `.parse()` calls in `customer-tags.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-customer-tags typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in customer-tags.spec.ts. A route that
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
 * never a reason to loosen the schema. See task-4c-customer-tags-report.md for every
 * mismatch found while building this file and which side was fixed.
 *
 * Core-Medusa entities embedded in a response (customer/order/product/user) are
 * deliberately NOT modelled field-by-field: this file tests THIS plugin's contract,
 * not Medusa's. They get `z.object({ id: z.string() }).passthrough()`.
 */
import { z } from '@medusajs/framework/zod'
import type { AdminCustomer } from '@medusajs/framework/types'
import type {
	AdminAddCustomerTagResponse,
	AdminCustomerTag,
	AdminCustomerTagResponse,
	AdminCustomerTagsResponse,
	AdminDeleteCustomerTagsResponse,
	AdminRemoveCustomerTagResponse,
	CustomerWithTags
} from '../../src/admin/types'

// A core-Medusa entity embedded in one of this plugin's responses (AdminCustomer).
// Only `id` is asserted at runtime -- the schemas below that embed a core entity use
// `.passthrough()` so whatever other keys the route happens to return are kept without
// being asserted on.
//
// The TS-facing type is force-narrowed to `CoreEntityRef` (`{ id: string }`) via the
// `as unknown as` cast used below, rather than left as zod's inferred
// `{ id: string; [x: string]: unknown }`. That inferred type carries a string index
// signature, and TypeScript never considers a type WITHOUT an index signature -- e.g.
// the real `AdminCustomer` -- assignable to/from one that has one, no matter which
// properties are actually present. Left un-narrowed, every two-way assignability const
// involving an embedded core entity fails to compile with a misleading "missing
// properties" error. Every place this file embeds a core entity uses `CoreEntityRef`
// (via `Omit<..., K> & { ... CoreEntityRef ... }`) on BOTH sides of the comparison so
// the mismatch cancels out, leaving the real two-way check to do its job on every
// field that is actually this plugin's contract.
//
// Unlike complaints (which embeds customer/order/product as ordinary nested fields on
// its own type), this plugin's only core-entity case is the customer/order object
// itself carrying an extra `customer_tags` field (see `CustomerWithTagsSchema` below),
// so there is no bare "just an id" nested schema to factor out here -- `CoreEntityRef`
// is used directly as the reduced-fidelity type, with no matching `CoreEntitySchema`
// const.
type CoreEntityRef = { id: string }

// ── Customer tags ────────────────────────────────────────────────────────────

export const AdminCustomerTagSchema = z.strictObject({
	id: z.string(),
	value: z.string(),
	created_at: z.string(),
	updated_at: z.string()
})
const _tagSchemaMatchesType: AdminCustomerTag = {} as z.infer<typeof AdminCustomerTagSchema>
const _tagTypeMatchesSchema: z.infer<typeof AdminCustomerTagSchema> = {} as AdminCustomerTag

export const AdminCustomerTagResponseSchema = z.strictObject({
	customer_tag: AdminCustomerTagSchema
})
const _tagResponseSchemaMatchesType: AdminCustomerTagResponse = {} as z.infer<typeof AdminCustomerTagResponseSchema>
const _tagResponseTypeMatchesSchema: z.infer<typeof AdminCustomerTagResponseSchema> = {} as AdminCustomerTagResponse

export const AdminCustomerTagsResponseSchema = z.strictObject({
	customer_tags: z.array(AdminCustomerTagSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number(),
	estimate_count: z.number().optional()
})
const _tagsResponseSchemaMatchesType: AdminCustomerTagsResponse = {} as z.infer<typeof AdminCustomerTagsResponseSchema>
const _tagsResponseTypeMatchesSchema: z.infer<typeof AdminCustomerTagsResponseSchema> = {} as AdminCustomerTagsResponse

export const AdminDeleteCustomerTagsResponseSchema = z.strictObject({
	deleted: z.array(z.string())
})
const _deleteResponseSchemaMatchesType: AdminDeleteCustomerTagsResponse = {} as z.infer<typeof AdminDeleteCustomerTagsResponseSchema>
const _deleteResponseTypeMatchesSchema: z.infer<typeof AdminDeleteCustomerTagsResponseSchema> = {} as AdminDeleteCustomerTagsResponse

// ── Customer <-> tag links ───────────────────────────────────────────────────
// POST/DELETE /admin/customers/:id/customer-tags[/:tagId] -- the routes the customer
// and order widgets call to assign/unassign a tag inline.

export const AdminAddCustomerTagResponseSchema = z.strictObject({
	customer_id: z.string(),
	tag: z.string()
})
const _addResponseSchemaMatchesType: AdminAddCustomerTagResponse = {} as z.infer<typeof AdminAddCustomerTagResponseSchema>
const _addResponseTypeMatchesSchema: z.infer<typeof AdminAddCustomerTagResponseSchema> = {} as AdminAddCustomerTagResponse

export const AdminRemoveCustomerTagResponseSchema = z.strictObject({
	customer_id: z.string(),
	tag_id: z.string(),
	deleted: z.boolean()
})
const _removeResponseSchemaMatchesType: AdminRemoveCustomerTagResponse = {} as z.infer<typeof AdminRemoveCustomerTagResponseSchema>
const _removeResponseTypeMatchesSchema: z.infer<typeof AdminRemoveCustomerTagResponseSchema> = {} as AdminRemoveCustomerTagResponse

// ── Customer (core entity) with linked tags ─────────────────────────────────
// GET /admin/customers/:id?fields=+customer_tags.id,+customer_tags.value -- the shape
// the customer widget reads `associatedTags` off of. `AdminCustomer` itself is a
// core-Medusa entity and is NOT modelled field-by-field (see CoreEntityRef above);
// only the plugin-owned `customer_tags` link is checked, and checked against the real
// `CustomerWithTags` type (via `Omit<CustomerWithTags, keyof AdminCustomer>`) so a
// rename of that field still fails the build.
//
// `customer_tags` here is intentionally a NARROWER ref (`id`/`value` only), not the
// full `AdminCustomerTagSchema` -- the widget only ever requests and renders those two
// fields (see finding notes in task-4c-customer-tags-report.md: the widget's query
// originally over-fetched `+customer_tags.*`, silently leaking `metadata`/`deleted_at`
// over the wire; fixed to request only what's read).
const CustomerLinkedTagRefSchema = z.strictObject({ id: z.string(), value: z.string() })
export const CustomerWithTagsSchema = z
	.object({
		id: z.string(),
		customer_tags: z.array(CustomerLinkedTagRefSchema).optional()
	})
	.passthrough() as unknown as z.ZodType<CoreEntityRef & Omit<CustomerWithTags, keyof AdminCustomer>>
type CustomerWithTagsContract = CoreEntityRef & Omit<CustomerWithTags, keyof AdminCustomer>
const _customerWithTagsSchemaMatchesType: CustomerWithTagsContract = {} as z.infer<typeof CustomerWithTagsSchema>
const _customerWithTagsTypeMatchesSchema: z.infer<typeof CustomerWithTagsSchema> = {} as CustomerWithTagsContract

export const AdminCustomerWithTagsResponseSchema = z.strictObject({
	customer: CustomerWithTagsSchema
})
type AdminCustomerWithTagsResponseContract = { customer: CustomerWithTagsContract }
const _customerWithTagsResponseSchemaMatchesType: AdminCustomerWithTagsResponseContract = {} as z.infer<typeof AdminCustomerWithTagsResponseSchema>
const _customerWithTagsResponseTypeMatchesSchema: z.infer<typeof AdminCustomerWithTagsResponseSchema> = {} as AdminCustomerWithTagsResponseContract
