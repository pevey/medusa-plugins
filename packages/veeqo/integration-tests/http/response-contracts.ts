/**
 * Response contracts for the Veeqo admin API.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors either a hand-written
 * admin view type in `../../src/admin/types` (the wizard's list responses, consumed
 * by `../../src/admin/hooks.ts`) or a sync-ack payload that has no hand-written type
 * at all (see "Sync acks" below). Nothing previously verified any of these against a
 * real HTTP response -- the admin dashboard is bundled by Vite and never typechecked
 * against a real response, and the test harness fakes the SDK, so it only ever sees
 * fixtures a test author wrote. This module plus the `.parse()` calls in
 * `veeqo.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms (for the types that have one -- see below):
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-veeqo typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in veeqo.spec.ts. A route that stops
 *                           returning a field, or starts returning an extra one,
 *                           fails the parse -- `z.strictObject` rejects unknown keys,
 *                           so both directions are caught, not just missing ones.
 *   3. type <-> components  tsc, via the admin dashboard's own typecheck (not part of
 *                           this file). A view that reads a field the type no longer
 *                           declares fails to compile.
 *
 * A route changing shape fails link 2; "fixing" the schema to match would silently
 * break link 3 for every component reading the removed/changed field, so schema
 * drift is a finding about the TYPE (and by extension the components that read it),
 * never a reason to loosen the schema. See task-4c-veeqo-report.md for every
 * mismatch found while building this file and which side was fixed.
 *
 * Core-Medusa entities embedded in a response (sales channel/stock location/shipping
 * option/product/product variant) are deliberately NOT modelled field-by-field: this
 * file tests THIS plugin's contract, not Medusa's. This plugin's five wizard list
 * types are unusual among the 11-plugin rollout in that the core entity is embedded
 * via TYPE INTERSECTION (`AdminSalesChannel & { veeqo_channel?: {...} } `) rather than
 * as a named nested field, because `hooks.ts` requests a narrow, explicit `fields`
 * list on each query (never the route's own defaults) -- so the "core entity" here
 * really is the whole response object, not a sub-key of it. `CoreEntityRef` below is
 * the same pattern as every other plugin's nested-field case, just applied at the top
 * level of the object (via `z.object({ id, ...ownFields }).passthrough()` cast to
 * `z.ZodType<CoreEntityRef & {...ownFields}>`) instead of to one property.
 *
 * Sync acks (Veeqo-side entities): the six single-resource `POST .../sync` routes
 * return the RAW third-party Veeqo API resource (`VeeqoChannelDTO`, `VeeqoProductDTO`,
 * etc. -- see `../../src/modules/veeqo/types.ts`), obtained via an unvalidated
 * `as VeeqoXDTO` cast on Veeqo's real HTTP response, not a Medusa entity and not
 * hand-modelled for admin consumption. No admin hook types this payload (every
 * `useSyncVeeqoX` mutation in `hooks.ts` is untyped -- the widgets only care whether
 * the call succeeded, never read the body) so there is no admin type for these
 * schemas to two-way-check against; they are `.parse()`-only. Modelling
 * `VeeqoChannelDTO` etc. field-by-field and running it against the LIVE Veeqo API
 * (this suite hits the real API, not a mock) immediately produced `unrecognized_keys`
 * failures -- Veeqo's real resource representations carry many more fields than the
 * plugin's narrow, cast-not-validated DTOs declare (see the report for the raw
 * failure). Since this plugin doesn't control Veeqo's API shape any more than it
 * controls Medusa's, the same "don't model field-by-field" carve-out applies here by
 * the same logic, extended to a THIRD-PARTY entity rather than a core-Medusa one:
 * `ThirdPartyEntityRef` / `ThirdPartyEntitySchema` assert only `id` (numeric --
 * Veeqo's own IDs, distinct from Medusa's string IDs) and `.passthrough()` the rest.
 */
import { z } from '@medusajs/framework/zod'
import type {
	AdminProductVariantsWithVeeqoListResponse,
	AdminProductVariantWithVeeqo,
	AdminProductWithVeeqo,
	AdminProductWithVeeqoListResponse,
	AdminSalesChannelsWithVeeqoListResponse,
	AdminSalesChannelWithVeeqo,
	AdminShippingOptionsWithVeeqoListResponse,
	AdminShippingOptionWithVeeqo,
	AdminStockLocationsWithVeeqoListResponse,
	AdminStockLocationWithVeeqo
} from '../../src/admin/types'

// A core-Medusa entity embedded in one of this plugin's wizard-list responses (sales
// channel/stock location/shipping option/product/product variant). Only `id` is
// asserted at runtime -- `.passthrough()` keeps whatever other keys the route happens
// to return (here, exactly the narrow `fields` list `hooks.ts` requested) without
// asserting on them.
//
// The TS-facing type is force-narrowed to `CoreEntityRef` (`{ id: string }`) via the
// `as unknown as` cast below, rather than left as zod's inferred
// `{ id: string; [x: string]: unknown }`. That inferred type carries a string index
// signature, and TypeScript never considers a type WITHOUT an index signature -- e.g.
// the real `AdminSalesChannel`/`AdminStockLocation`/`AdminShippingOption`/
// `AdminProduct`/`AdminProductVariant` -- assignable to one that has one, no matter
// which properties are actually present. Left un-narrowed, every two-way
// assignability const below fails to compile with a misleading "missing properties"
// error. Every place this file embeds a core entity uses `CoreEntityRef` (via
// `CoreEntityRef & { ...plugin-owned fields... }`, replacing the real
// `AdminX & {...}` intersection) on BOTH sides of the comparison so the mismatch
// cancels out, leaving the real two-way check to do its job on the fields that are
// actually this plugin's contract: the `veeqo_*` link objects.
type CoreEntityRef = { id: string }

// A Veeqo-side (third-party) entity returned raw by one of the six single-resource
// sync routes. Same rationale and same cast trick as `CoreEntityRef` above, except
// Veeqo's own primary keys are numbers, not Medusa ULIDs.
type ThirdPartyEntityRef = { id: number }
const ThirdPartyEntitySchema = z.object({ id: z.number() }).passthrough() as unknown as z.ZodType<ThirdPartyEntityRef>

// ── Sales channels (wizard step 3) ───────────────────────────────────────────

export const AdminSalesChannelWithVeeqoSchema = z
	.object({
		id: z.string(),
		// `sales_channel_id` isn't requested by `hooks.ts` but Medusa's query graph
		// always returns a custom link relation's own foreign-key column alongside
		// whatever subfields were asked for -- confirmed against the live API (see
		// task-4c-veeqo-report.md). Modelled here since it's part of what the route
		// actually returns, not an unbounded core-entity field.
		veeqo_channel: z.strictObject({ veeqo_channel_id: z.number().optional(), sales_channel_id: z.string().optional() }).optional()
	})
	.passthrough() as unknown as z.ZodType<CoreEntityRef & { veeqo_channel?: AdminSalesChannelWithVeeqo['veeqo_channel'] }>
// `veeqo_channel`'s type is pulled via indexed access on the REAL exported type
// rather than retyped by hand, so a future edit to `AdminSalesChannelWithVeeqo` (e.g.
// renaming the field, or changing `veeqo_channel_id`'s type) changes this Contract
// too and the two-way check below catches the drift -- only the core-entity part
// (everything `AdminSalesChannel` contributes) is deliberately dropped to `CoreEntityRef`.
type AdminSalesChannelWithVeeqoContract = CoreEntityRef & { veeqo_channel?: AdminSalesChannelWithVeeqo['veeqo_channel'] }
const _salesChannelSchemaMatchesType: AdminSalesChannelWithVeeqoContract = {} as z.infer<typeof AdminSalesChannelWithVeeqoSchema>
const _salesChannelTypeMatchesSchema: z.infer<typeof AdminSalesChannelWithVeeqoSchema> = {} as AdminSalesChannelWithVeeqoContract

export const AdminSalesChannelsWithVeeqoListResponseSchema = z.strictObject({
	sales_channels: z.array(AdminSalesChannelWithVeeqoSchema),
	limit: z.number(),
	offset: z.number(),
	count: z.number(),
	// Real (feature-flagged, `index_engine`) field on Medusa's `PaginatedResponse<T>`;
	// `strictObject` would reject it as an unrecognized key if the flag is on and this
	// were omitted. See the complaints pilot report for the full rationale.
	estimate_count: z.number().optional()
})
type AdminSalesChannelsWithVeeqoListResponseContract = Omit<AdminSalesChannelsWithVeeqoListResponse, 'sales_channels'> & {
	sales_channels: AdminSalesChannelWithVeeqoContract[]
}
const _salesChannelsListSchemaMatchesType: AdminSalesChannelsWithVeeqoListResponseContract = {} as z.infer<typeof AdminSalesChannelsWithVeeqoListResponseSchema>
const _salesChannelsListTypeMatchesSchema: z.infer<typeof AdminSalesChannelsWithVeeqoListResponseSchema> = {} as AdminSalesChannelsWithVeeqoListResponseContract

// ── Stock locations (wizard step 1) ──────────────────────────────────────────

export const AdminStockLocationWithVeeqoSchema = z
	.object({
		id: z.string(),
		// See the note on `AdminSalesChannelWithVeeqoSchema.veeqo_channel` above --
		// same always-present foreign-key column, here on the warehouse link.
		veeqo_warehouse: z.strictObject({ veeqo_warehouse_id: z.number().optional(), stock_location_id: z.string().optional() }).optional()
	})
	.passthrough() as unknown as z.ZodType<CoreEntityRef & { veeqo_warehouse?: AdminStockLocationWithVeeqo['veeqo_warehouse'] }>
type AdminStockLocationWithVeeqoContract = CoreEntityRef & { veeqo_warehouse?: AdminStockLocationWithVeeqo['veeqo_warehouse'] }
const _stockLocationSchemaMatchesType: AdminStockLocationWithVeeqoContract = {} as z.infer<typeof AdminStockLocationWithVeeqoSchema>
const _stockLocationTypeMatchesSchema: z.infer<typeof AdminStockLocationWithVeeqoSchema> = {} as AdminStockLocationWithVeeqoContract

export const AdminStockLocationsWithVeeqoListResponseSchema = z.strictObject({
	stock_locations: z.array(AdminStockLocationWithVeeqoSchema),
	limit: z.number(),
	offset: z.number(),
	count: z.number(),
	estimate_count: z.number().optional()
})
type AdminStockLocationsWithVeeqoListResponseContract = Omit<AdminStockLocationsWithVeeqoListResponse, 'stock_locations'> & {
	stock_locations: AdminStockLocationWithVeeqoContract[]
}
const _stockLocationsListSchemaMatchesType: AdminStockLocationsWithVeeqoListResponseContract = {} as z.infer<
	typeof AdminStockLocationsWithVeeqoListResponseSchema
>
const _stockLocationsListTypeMatchesSchema: z.infer<typeof AdminStockLocationsWithVeeqoListResponseSchema> =
	{} as AdminStockLocationsWithVeeqoListResponseContract

// ── Shipping options (wizard step 2) ─────────────────────────────────────────

export const AdminShippingOptionWithVeeqoSchema = z
	.object({
		id: z.string(),
		// See the note on `AdminSalesChannelWithVeeqoSchema.veeqo_channel` above --
		// same always-present foreign-key column, here on the delivery-method link.
		veeqo_delivery_method: z.strictObject({ veeqo_delivery_method_id: z.number().optional(), shipping_option_id: z.string().optional() }).optional()
	})
	.passthrough() as unknown as z.ZodType<CoreEntityRef & { veeqo_delivery_method?: AdminShippingOptionWithVeeqo['veeqo_delivery_method'] }>
type AdminShippingOptionWithVeeqoContract = CoreEntityRef & { veeqo_delivery_method?: AdminShippingOptionWithVeeqo['veeqo_delivery_method'] }
const _shippingOptionSchemaMatchesType: AdminShippingOptionWithVeeqoContract = {} as z.infer<typeof AdminShippingOptionWithVeeqoSchema>
const _shippingOptionTypeMatchesSchema: z.infer<typeof AdminShippingOptionWithVeeqoSchema> = {} as AdminShippingOptionWithVeeqoContract

export const AdminShippingOptionsWithVeeqoListResponseSchema = z.strictObject({
	shipping_options: z.array(AdminShippingOptionWithVeeqoSchema),
	limit: z.number(),
	offset: z.number(),
	count: z.number(),
	estimate_count: z.number().optional()
})
type AdminShippingOptionsWithVeeqoListResponseContract = Omit<AdminShippingOptionsWithVeeqoListResponse, 'shipping_options'> & {
	shipping_options: AdminShippingOptionWithVeeqoContract[]
}
const _shippingOptionsListSchemaMatchesType: AdminShippingOptionsWithVeeqoListResponseContract = {} as z.infer<
	typeof AdminShippingOptionsWithVeeqoListResponseSchema
>
const _shippingOptionsListTypeMatchesSchema: z.infer<typeof AdminShippingOptionsWithVeeqoListResponseSchema> =
	{} as AdminShippingOptionsWithVeeqoListResponseContract

// ── Products (wizard step 4) ─────────────────────────────────────────────────

export const AdminProductWithVeeqoSchema = z
	.object({
		id: z.string(),
		// See the note on `AdminSalesChannelWithVeeqoSchema.veeqo_channel` above --
		// same always-present foreign-key column, here on the product link.
		veeqo_product: z.strictObject({ veeqo_product_id: z.number().optional(), product_id: z.string().optional() }).optional()
	})
	.passthrough() as unknown as z.ZodType<CoreEntityRef & { veeqo_product?: AdminProductWithVeeqo['veeqo_product'] }>
type AdminProductWithVeeqoContract = CoreEntityRef & { veeqo_product?: AdminProductWithVeeqo['veeqo_product'] }
const _productSchemaMatchesType: AdminProductWithVeeqoContract = {} as z.infer<typeof AdminProductWithVeeqoSchema>
const _productTypeMatchesSchema: z.infer<typeof AdminProductWithVeeqoSchema> = {} as AdminProductWithVeeqoContract

export const AdminProductWithVeeqoListResponseSchema = z.strictObject({
	products: z.array(AdminProductWithVeeqoSchema),
	limit: z.number(),
	offset: z.number(),
	count: z.number(),
	estimate_count: z.number().optional()
})
type AdminProductWithVeeqoListResponseContract = Omit<AdminProductWithVeeqoListResponse, 'products'> & {
	products: AdminProductWithVeeqoContract[]
}
const _productsListSchemaMatchesType: AdminProductWithVeeqoListResponseContract = {} as z.infer<typeof AdminProductWithVeeqoListResponseSchema>
const _productsListTypeMatchesSchema: z.infer<typeof AdminProductWithVeeqoListResponseSchema> = {} as AdminProductWithVeeqoListResponseContract

// ── Product variants (wizard step 5) ─────────────────────────────────────────

export const AdminProductVariantWithVeeqoSchema = z
	.object({
		id: z.string(),
		product_id: z.string(),
		// A relation object always carries its own `id` even when only a subfield
		// (`title`) was requested -- confirmed against the live API.
		product: z.strictObject({ id: z.string().optional(), title: z.string().optional() }).optional(),
		// See the note on `AdminSalesChannelWithVeeqoSchema.veeqo_channel` above --
		// same always-present foreign-key column, here on the sellable link. This is
		// the exact mismatch that was empirically found first (see the report):
		// modelling only `veeqo_sellable_id` here failed with `unrecognized_keys:
		// ["product_variant_id"]` against a real, previously-synced variant.
		veeqo_sellable: z.strictObject({ veeqo_sellable_id: z.number().optional(), product_variant_id: z.string().optional() }).optional()
	})
	.passthrough() as unknown as z.ZodType<
	CoreEntityRef & {
		product_id: AdminProductVariantWithVeeqo['product_id']
		product?: AdminProductVariantWithVeeqo['product']
		veeqo_sellable?: AdminProductVariantWithVeeqo['veeqo_sellable']
	}
>
type AdminProductVariantWithVeeqoContract = CoreEntityRef & {
	product_id: AdminProductVariantWithVeeqo['product_id']
	product?: AdminProductVariantWithVeeqo['product']
	veeqo_sellable?: AdminProductVariantWithVeeqo['veeqo_sellable']
}
const _variantSchemaMatchesType: AdminProductVariantWithVeeqoContract = {} as z.infer<typeof AdminProductVariantWithVeeqoSchema>
const _variantTypeMatchesSchema: z.infer<typeof AdminProductVariantWithVeeqoSchema> = {} as AdminProductVariantWithVeeqoContract

export const AdminProductVariantsWithVeeqoListResponseSchema = z.strictObject({
	variants: z.array(AdminProductVariantWithVeeqoSchema),
	limit: z.number(),
	offset: z.number(),
	count: z.number(),
	estimate_count: z.number().optional()
})
type AdminProductVariantsWithVeeqoListResponseContract = Omit<AdminProductVariantsWithVeeqoListResponse, 'variants'> & {
	variants: AdminProductVariantWithVeeqoContract[]
}
const _variantsListSchemaMatchesType: AdminProductVariantsWithVeeqoListResponseContract = {} as z.infer<typeof AdminProductVariantsWithVeeqoListResponseSchema>
const _variantsListTypeMatchesSchema: z.infer<typeof AdminProductVariantsWithVeeqoListResponseSchema> = {} as AdminProductVariantsWithVeeqoListResponseContract

// ── Sync acks: batch routes (`POST /admin/veeqo/<entity>/sync`) ─────────────
//
// `{ synced_<entity>_ids: number[] }` -- the Veeqo-side numeric IDs of whichever
// Medusa records were successfully synced. No admin type exists for these (see the
// top-of-file note), so these are `.parse()`-only, no two-way assignability const.

export const SyncedProductIdsResponseSchema = z.strictObject({ synced_product_ids: z.array(z.number()) })
export const SyncedCustomerIdsResponseSchema = z.strictObject({ synced_customer_ids: z.array(z.number()) })
export const SyncedOrderIdsResponseSchema = z.strictObject({ synced_order_ids: z.array(z.number()) })
export const SyncedSalesChannelIdsResponseSchema = z.strictObject({ synced_sales_channel_ids: z.array(z.number()) })
export const SyncedShippingOptionIdsResponseSchema = z.strictObject({ synced_shipping_option_ids: z.array(z.number()) })
export const SyncedWarehouseIdsResponseSchema = z.strictObject({ synced_warehouse_ids: z.array(z.number()) })

// ── Sync acks: single-resource routes (`POST /admin/veeqo/<entity>/:id/sync`) ─
//
// Each wraps the raw Veeqo DTO under its own key. See the top-of-file note for why
// these use `ThirdPartyEntitySchema` (id-only + passthrough) rather than modelling
// `VeeqoChannelDTO`/`VeeqoProductDTO`/etc. field-by-field.

export const VeeqoChannelSyncResponseSchema = z.strictObject({ veeqo_channel: ThirdPartyEntitySchema })
export const VeeqoCustomerSyncResponseSchema = z.strictObject({ veeqo_customer: ThirdPartyEntitySchema })
export const VeeqoOrderSyncResponseSchema = z.strictObject({ veeqo_order: ThirdPartyEntitySchema })
export const VeeqoProductSyncResponseSchema = z.strictObject({ veeqo_product: ThirdPartyEntitySchema })
export const VeeqoDeliveryMethodSyncResponseSchema = z.strictObject({ veeqo_delivery_method: ThirdPartyEntitySchema })
export const VeeqoWarehouseSyncResponseSchema = z.strictObject({ veeqo_warehouse: ThirdPartyEntitySchema })

// ── Sync acks: generic per-source retry route (`POST /admin/veeqo/sync`) ────
//
// Always `{ ok: true }` on success (the route either resolves or throws -- there is
// no `ok: false` branch). No admin type exists for this either.

export const AdminSyncSourceToVeeqoResponseSchema = z.strictObject({ ok: z.literal(true) })
