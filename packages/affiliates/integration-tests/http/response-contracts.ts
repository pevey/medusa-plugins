/**
 * Response contracts for the affiliates admin API.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the hand-written
 * admin view types in `../../src/admin/types` (plus a couple of workflow-level result
 * types reused verbatim for POST responses -- see below). Nothing previously verified
 * those hand-written types actually matched what the routes return -- the admin
 * dashboard is bundled by Vite and never typechecked against a real HTTP response, and
 * the test harness fakes the SDK, so it only ever sees fixtures a test author wrote.
 * This module plus the `.parse()` calls in `affiliates.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-affiliates typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in affiliates.spec.ts. A route that
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
 * never a reason to loosen the schema. See task-4c-affiliates-report.md for every
 * mismatch found while building this file and which side was fixed.
 *
 * Unlike complaints (the pilot for this pattern), this plugin does NOT embed any
 * full core-Medusa `Admin*` entity in a response -- `AdminAffiliatePromotion` is a
 * hand-selected subset of the linked core `Promotion` entity (via the
 * affiliate<->promotion module link), not the real `AdminPromotion` type, so it is
 * modelled field-by-field like everything else here. The `CoreEntityRef` /
 * `as unknown as z.ZodType<...>` workaround documented in complaints'
 * response-contracts.ts is therefore not needed in this file.
 */
import { z } from '@medusajs/framework/zod'
import type {
	AdminAffiliate,
	AdminAffiliateAddress,
	AdminAffiliatePromotion,
	AdminAffiliateResponse,
	AdminAffiliatesResponse,
	AdminAffiliateStatsBucket,
	AdminAffiliateStatsResponse
} from '../../src/admin/types'
import type { AddAffiliateAddressResult } from '../../src/workflows/add-affiliate-address'
import type { CreateAffiliateResult } from '../../src/workflows/create-affiliate'
import type { CreateAffiliatePromotionResult } from '../../src/workflows/create-affiliate-promotion'

// ── Affiliate addresses ──────────────────────────────────────────────────────

export const AdminAffiliateAddressSchema = z.strictObject({
	id: z.string(),
	affiliate_id: z.string(),
	first_name: z.string().nullable(),
	last_name: z.string().nullable(),
	company: z.string().nullable(),
	address_1: z.string().nullable(),
	address_2: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	country_code: z.string().nullable(),
	postal_code: z.string().nullable(),
	phone: z.string().nullable()
})
const _addressSchemaMatchesType: AdminAffiliateAddress = {} as z.infer<typeof AdminAffiliateAddressSchema>
const _addressTypeMatchesSchema: z.infer<typeof AdminAffiliateAddressSchema> = {} as AdminAffiliateAddress

// ── Affiliate promotions ─────────────────────────────────────────────────────
// A hand-selected subset of the core `Promotion` entity -- see the type's own
// comment in admin/types.ts. `campaign_id` and the nested `id` fields are real,
// always-present columns/relation ids, not a leak of the raw ORM entity: the
// detail route's `defaults` explicitly select `campaign.id`/`campaign.ends_at`
// and `application_method.type`/`application_method.value` only (no metadata,
// timestamps, or `deleted_at` -- verified against a real response while building
// this file, see task-4c-affiliates-report.md finding 3).

export const AdminAffiliatePromotionSchema = z.strictObject({
	id: z.string(),
	code: z.string(),
	status: z.enum(['active', 'inactive', 'draft']),
	is_automatic: z.boolean(),
	campaign_id: z.string().nullable(),
	campaign: z
		.strictObject({
			id: z.string(),
			ends_at: z.string().nullable()
		})
		.nullable()
		.optional(),
	application_method: z
		.strictObject({
			id: z.string(),
			type: z.enum(['percentage', 'fixed']),
			value: z.number()
		})
		.nullable()
		.optional()
})
const _promotionSchemaMatchesType: AdminAffiliatePromotion = {} as z.infer<typeof AdminAffiliatePromotionSchema>
const _promotionTypeMatchesSchema: z.infer<typeof AdminAffiliatePromotionSchema> = {} as AdminAffiliatePromotion

// ── Affiliates ────────────────────────────────────────────────────────────────

export const AdminAffiliateSchema = z.strictObject({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	phone: z.string().nullable(),
	currency_code: z.string().nullable(),
	status: z.enum(['active', 'restricted', 'inactive']),
	// Detail-only -- see the type's own comment in admin/types.ts.
	primary_address_id: z.string().nullable().optional(),
	created_at: z.string(),
	addresses: z.array(AdminAffiliateAddressSchema).optional(),
	promotions: z.array(AdminAffiliatePromotionSchema).optional()
})
const _affiliateSchemaMatchesType: AdminAffiliate = {} as z.infer<typeof AdminAffiliateSchema>
const _affiliateTypeMatchesSchema: z.infer<typeof AdminAffiliateSchema> = {} as AdminAffiliate

export const AdminAffiliateResponseSchema = z.strictObject({
	affiliate: AdminAffiliateSchema
})
const _affiliateResponseSchemaMatchesType: AdminAffiliateResponse = {} as z.infer<typeof AdminAffiliateResponseSchema>
const _affiliateResponseTypeMatchesSchema: z.infer<typeof AdminAffiliateResponseSchema> = {} as AdminAffiliateResponse

export const AdminAffiliatesResponseSchema = z.strictObject({
	affiliates: z.array(AdminAffiliateSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number()
})
const _affiliatesResponseSchemaMatchesType: AdminAffiliatesResponse = {} as z.infer<typeof AdminAffiliatesResponseSchema>
const _affiliatesResponseTypeMatchesSchema: z.infer<typeof AdminAffiliatesResponseSchema> = {} as AdminAffiliatesResponse

// ── Affiliate stats ───────────────────────────────────────────────────────────
// All bucket amounts are plain JS numbers, not Medusa BigNumber-serialized
// objects: `gross_subtotal`/`net_subtotal` are summed in `stats.ts` from the
// affiliate module's own `affiliate_attribution.gross_subtotal`/`net_subtotal`
// columns, which are declared `model.number()` (a plain float/int column on
// this plugin's own module, not a core-Medusa BigNumber column) -- confirmed
// against a real response while building this file.

export const AdminAffiliateStatsBucketSchema = z.strictObject({
	currency_code: z.string(),
	order_count: z.number(),
	gross_total: z.number(),
	net_total: z.number(),
	average_order_value_gross: z.number(),
	average_order_value_net: z.number()
})
const _bucketSchemaMatchesType: AdminAffiliateStatsBucket = {} as z.infer<typeof AdminAffiliateStatsBucketSchema>
const _bucketTypeMatchesSchema: z.infer<typeof AdminAffiliateStatsBucketSchema> = {} as AdminAffiliateStatsBucket

export const AdminAffiliateStatsResponseSchema = z.strictObject({
	basis: z.enum(['placed', 'captured', 'completed']),
	window: z.enum(['day', 'week', 'month', 'year', 'all']),
	promotion_id: z.string().nullable(),
	primary_currency_code: z.string().nullable(),
	buckets: z.array(AdminAffiliateStatsBucketSchema)
})
const _statsResponseSchemaMatchesType: AdminAffiliateStatsResponse = {} as z.infer<typeof AdminAffiliateStatsResponseSchema>
const _statsResponseTypeMatchesSchema: z.infer<typeof AdminAffiliateStatsResponseSchema> = {} as AdminAffiliateStatsResponse

// ── Write-route responses (checked for the raw-entity-leak pattern) ─────────
// Per the task brief: watch for a POST create route returning the raw ORM
// entity (leaking `deleted_at`/`metadata`) where the matching GET is
// field-selected. All three `POST` create routes in this plugin build their
// result via a workflow `transform` step rather than returning an entity
// directly, so their existing exported workflow result types are reused
// verbatim here -- no leak found (see task-4c-affiliates-report.md).

export const AdminCreateAffiliateResponseSchema = z.strictObject({
	affiliate: z.strictObject({
		affiliate_id: z.string(),
		primary_address_id: z.string(),
		promotion_id: z.string()
	})
})
type AdminCreateAffiliateResponseContract = { affiliate: CreateAffiliateResult }
const _createAffiliateSchemaMatchesType: AdminCreateAffiliateResponseContract = {} as z.infer<typeof AdminCreateAffiliateResponseSchema>
const _createAffiliateTypeMatchesSchema: z.infer<typeof AdminCreateAffiliateResponseSchema> = {} as AdminCreateAffiliateResponseContract

export const AdminAddAffiliateAddressResponseSchema = z.strictObject({
	address: z.strictObject({
		id: z.string()
	})
})
type AdminAddAffiliateAddressResponseContract = { address: AddAffiliateAddressResult }
const _addAddressSchemaMatchesType: AdminAddAffiliateAddressResponseContract = {} as z.infer<typeof AdminAddAffiliateAddressResponseSchema>
const _addAddressTypeMatchesSchema: z.infer<typeof AdminAddAffiliateAddressResponseSchema> = {} as AdminAddAffiliateAddressResponseContract

export const AdminCreateAffiliatePromotionResponseSchema = z.strictObject({
	promotion: z.strictObject({
		promotion_id: z.string(),
		campaign_id: z.string().nullable()
	})
})
type AdminCreateAffiliatePromotionResponseContract = { promotion: CreateAffiliatePromotionResult }
const _createPromotionSchemaMatchesType: AdminCreateAffiliatePromotionResponseContract = {} as z.infer<typeof AdminCreateAffiliatePromotionResponseSchema>
const _createPromotionTypeMatchesSchema: z.infer<typeof AdminCreateAffiliatePromotionResponseSchema> = {} as AdminCreateAffiliatePromotionResponseContract
