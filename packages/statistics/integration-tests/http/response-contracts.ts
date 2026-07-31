/**
 * Response contracts for the statistics admin API.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the hand-written
 * admin view types in `../../src/admin/types`. Nothing previously verified those
 * hand-written types actually matched what the routes return -- the admin dashboard
 * is bundled by Vite and never typechecked against a real HTTP response, and the
 * test harness fakes the SDK, so it only ever sees fixtures a test author wrote.
 * This module plus the `.parse()` calls in `statistics.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-statistics typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in statistics.spec.ts. A route that
 *                           stops returning a field, or starts returning an extra
 *                           one, fails the parse -- `z.strictObject` rejects unknown
 *                           keys, so both directions are caught, not just missing ones.
 *   3. type <-> components  tsc, via the admin dashboard's own typecheck (not part of
 *                           this file). A view/widget that reads a field the type no
 *                           longer declares fails to compile.
 *
 * A route changing shape fails link 2; "fixing" the schema to match would silently
 * break link 3 for every widget reading the removed/changed field, so schema drift
 * is a finding about the TYPE (and by extension the widgets that read it), never a
 * reason to loosen the schema. See task-4c-statistics-report.md for every mismatch
 * found while building this file and which side was fixed.
 *
 * Unlike the complaints pilot, NO route in this plugin embeds a core-Medusa entity
 * (AdminCustomer/AdminOrder/AdminProduct/AdminUser) as-is:
 *   - `GET /admin/statistics/recent-orders` deliberately requests a narrow, fixed
 *     field set via `query.graph({ entity: 'order', fields: [...] })` -- it does not
 *     embed a full AdminOrder, and the nested `customer` sub-object it requests
 *     (`customer.first_name`, `customer.last_name`) does not even include `id`. So
 *     this plugin's own `AdminStatisticsRecentOrder`/`...Customer` types are modelled
 *     field-by-field below, same as any other plugin-owned type -- the exemplar's
 *     `CoreEntityRef` pattern (see complaints' response-contracts.ts) does not apply
 *     here and is deliberately NOT used.
 *   - `top_products` is a plugin-owned JSON column (`{ product_id, title,
 *     quantity_sold }`, written by this plugin's own daily aggregation job), not a
 *     relation to the real product catalog -- also plain plugin data, not a core
 *     entity embed.
 */
import { z } from '@medusajs/framework/zod'
import type {
	AdminRecalculateStatisticsResponse,
	AdminSaveStatisticsLayoutResponse,
	AdminStatisticsDaily,
	AdminStatisticsLayoutItem,
	AdminStatisticsLayoutResponse,
	AdminStatisticsLowStockResponse,
	AdminStatisticsLowStockWarning,
	AdminStatisticsRecentOrder,
	AdminStatisticsRecentOrdersResponse,
	AdminStatisticsResponse,
	AdminStatisticsTopProduct,
	AdminStatisticsTotals
} from '../../src/admin/types'

// ── Statistics (daily rows + aggregated totals) ──────────────────────────────

export const AdminStatisticsTopProductSchema = z.strictObject({
	product_id: z.string(),
	title: z.string(),
	quantity_sold: z.number()
})
const _topProductSchemaMatchesType: AdminStatisticsTopProduct = {} as z.infer<typeof AdminStatisticsTopProductSchema>
const _topProductTypeMatchesSchema: z.infer<typeof AdminStatisticsTopProductSchema> = {} as AdminStatisticsTopProduct

export const AdminStatisticsDailySchema = z.strictObject({
	id: z.string(),
	date: z.string(),
	revenue_total: z.number(),
	order_count: z.number(),
	average_order_value: z.number(),
	new_customer_count: z.number(),
	returning_customer_count: z.number(),
	pending_fulfillment_count: z.number(),
	low_stock_count: z.number(),
	top_products: z.array(AdminStatisticsTopProductSchema).nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	created_at: z.string(),
	updated_at: z.string(),
	deleted_at: z.string().nullable()
})
const _dailySchemaMatchesType: AdminStatisticsDaily = {} as z.infer<typeof AdminStatisticsDailySchema>
const _dailyTypeMatchesSchema: z.infer<typeof AdminStatisticsDailySchema> = {} as AdminStatisticsDaily

export const AdminStatisticsTotalsSchema = z.strictObject({
	revenue_total: z.number(),
	order_count: z.number(),
	average_order_value: z.number(),
	new_customer_count: z.number(),
	returning_customer_count: z.number(),
	pending_fulfillment_count: z.number(),
	low_stock_count: z.number()
})
const _totalsSchemaMatchesType: AdminStatisticsTotals = {} as z.infer<typeof AdminStatisticsTotalsSchema>
const _totalsTypeMatchesSchema: z.infer<typeof AdminStatisticsTotalsSchema> = {} as AdminStatisticsTotals

export const AdminStatisticsResponseSchema = z.strictObject({
	statistics: z.array(AdminStatisticsDailySchema),
	totals: AdminStatisticsTotalsSchema,
	period: z.enum(['today', 'week', 'month'])
})
const _statisticsResponseSchemaMatchesType: AdminStatisticsResponse = {} as z.infer<typeof AdminStatisticsResponseSchema>
const _statisticsResponseTypeMatchesSchema: z.infer<typeof AdminStatisticsResponseSchema> = {} as AdminStatisticsResponse

// ── Recent orders ─────────────────────────────────────────────────────────────

export const AdminStatisticsRecentOrderSchema = z.strictObject({
	id: z.string(),
	display_id: z.number(),
	status: z.string(),
	email: z.string().nullable(),
	total: z.number(),
	created_at: z.string(),
	customer_id: z.string(),
	customer: z
		.strictObject({
			id: z.string(),
			first_name: z.string().nullable(),
			last_name: z.string().nullable()
		})
		.nullable()
})
const _recentOrderSchemaMatchesType: AdminStatisticsRecentOrder = {} as z.infer<typeof AdminStatisticsRecentOrderSchema>
const _recentOrderTypeMatchesSchema: z.infer<typeof AdminStatisticsRecentOrderSchema> = {} as AdminStatisticsRecentOrder

export const AdminStatisticsRecentOrdersResponseSchema = z.strictObject({
	orders: z.array(AdminStatisticsRecentOrderSchema)
})
const _recentOrdersResponseSchemaMatchesType: AdminStatisticsRecentOrdersResponse = {} as z.infer<typeof AdminStatisticsRecentOrdersResponseSchema>
const _recentOrdersResponseTypeMatchesSchema: z.infer<typeof AdminStatisticsRecentOrdersResponseSchema> = {} as AdminStatisticsRecentOrdersResponse

// ── Low stock ─────────────────────────────────────────────────────────────────

export const AdminStatisticsLowStockWarningSchema = z.strictObject({
	inventory_item_id: z.string(),
	sku: z.string().nullable(),
	title: z.string().nullable(),
	location_name: z.string(),
	location_id: z.string(),
	reason: z.enum(['no_lots', 'low_stock']),
	available_quantity: z.number()
})
const _lowStockWarningSchemaMatchesType: AdminStatisticsLowStockWarning = {} as z.infer<typeof AdminStatisticsLowStockWarningSchema>
const _lowStockWarningTypeMatchesSchema: z.infer<typeof AdminStatisticsLowStockWarningSchema> = {} as AdminStatisticsLowStockWarning

export const AdminStatisticsLowStockResponseSchema = z.strictObject({
	warnings: z.array(AdminStatisticsLowStockWarningSchema),
	lot_data_available: z.boolean()
})
const _lowStockResponseSchemaMatchesType: AdminStatisticsLowStockResponse = {} as z.infer<typeof AdminStatisticsLowStockResponseSchema>
const _lowStockResponseTypeMatchesSchema: z.infer<typeof AdminStatisticsLowStockResponseSchema> = {} as AdminStatisticsLowStockResponse

// ── Layout ────────────────────────────────────────────────────────────────────

export const AdminStatisticsLayoutItemSchema = z.strictObject({
	widget_id: z.string(),
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
	visible: z.boolean()
})
const _layoutItemSchemaMatchesType: AdminStatisticsLayoutItem = {} as z.infer<typeof AdminStatisticsLayoutItemSchema>
const _layoutItemTypeMatchesSchema: z.infer<typeof AdminStatisticsLayoutItemSchema> = {} as AdminStatisticsLayoutItem

export const AdminStatisticsLayoutResponseSchema = z.strictObject({
	layout: z.array(AdminStatisticsLayoutItemSchema).nullable()
})
const _layoutResponseSchemaMatchesType: AdminStatisticsLayoutResponse = {} as z.infer<typeof AdminStatisticsLayoutResponseSchema>
const _layoutResponseTypeMatchesSchema: z.infer<typeof AdminStatisticsLayoutResponseSchema> = {} as AdminStatisticsLayoutResponse

export const AdminSaveStatisticsLayoutResponseSchema = z.strictObject({
	layout: z.array(AdminStatisticsLayoutItemSchema)
})
const _saveLayoutResponseSchemaMatchesType: AdminSaveStatisticsLayoutResponse = {} as z.infer<typeof AdminSaveStatisticsLayoutResponseSchema>
const _saveLayoutResponseTypeMatchesSchema: z.infer<typeof AdminSaveStatisticsLayoutResponseSchema> = {} as AdminSaveStatisticsLayoutResponse

// ── Recalculate ───────────────────────────────────────────────────────────────

export const AdminRecalculateStatisticsResponseSchema = z.strictObject({
	success: z.boolean()
})
const _recalculateResponseSchemaMatchesType: AdminRecalculateStatisticsResponse = {} as z.infer<typeof AdminRecalculateStatisticsResponseSchema>
const _recalculateResponseTypeMatchesSchema: z.infer<typeof AdminRecalculateStatisticsResponseSchema> = {} as AdminRecalculateStatisticsResponse
