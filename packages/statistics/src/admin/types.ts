// Admin-facing types for the statistics plugin's dashboard.
//
// NOTE: this file previously contained an unrelated, unused copy of the automation
// plugin's webhook types (`WebhookTrigger`/`WebhookAction`/etc.) -- dead leftover
// content, never imported by anything in this package (confirmed via grep across
// src/admin/). It has been replaced with this plugin's real admin types, which
// until now lived as un-exported locals inside `hooks/statistics.ts` and were
// never shared with `routes/statistics/widgets/index.ts`'s `WidgetProps` (which
// declared `statistics: any[]; totals: Record<string, any>` instead of reusing
// them). See response-contracts.ts and task-4c-statistics-report.md for the full
// investigation.

export type AdminStatisticsTopProduct = {
	product_id: string
	title: string
	quantity_sold: number
}

// One row from the `statistics_daily` table, returned as-is (no field selection)
// by `GET /admin/statistics` -- every column the model declares, plus the
// id/created_at/updated_at/deleted_at columns `model.define()` adds automatically.
export type AdminStatisticsDaily = {
	id: string
	date: string
	revenue_total: number
	order_count: number
	average_order_value: number
	new_customer_count: number
	returning_customer_count: number
	pending_fulfillment_count: number
	low_stock_count: number
	top_products: AdminStatisticsTopProduct[] | null
	metadata: Record<string, unknown> | null
	created_at: string
	updated_at: string
	deleted_at: string | null
}

export type AdminStatisticsTotals = {
	revenue_total: number
	order_count: number
	average_order_value: number
	new_customer_count: number
	returning_customer_count: number
	pending_fulfillment_count: number
	low_stock_count: number
}

export type AdminStatisticsPeriod = 'today' | 'week' | 'month'

export type AdminStatisticsResponse = {
	statistics: AdminStatisticsDaily[]
	totals: AdminStatisticsTotals
	period: AdminStatisticsPeriod
}

// A narrow, plugin-defined projection of an order -- `GET /admin/statistics/recent-orders`
// requests exactly these fields via `query.graph({ entity: 'order', fields: [...] })`.
// This is NOT the core Medusa AdminOrder entity embedded as-is, so it is modelled
// field-by-field rather than reduced to `CoreEntityRef`; see response-contracts.ts.
//
// `customer.id` and the order's own `customer_id` were NOT in the requested `fields`
// array (only `customer.first_name`/`customer.last_name` were) but both are present
// on the wire regardless -- Medusa's Query module auto-includes a relation's `id`
// and the owning side's foreign-key column whenever a nested relation is requested,
// even if neither is explicitly listed. Confirmed via the integration spec's real
// response; see task-4c-statistics-report.md.
export type AdminStatisticsRecentOrderCustomer = {
	id: string
	first_name: string | null
	last_name: string | null
}

export type AdminStatisticsRecentOrder = {
	id: string
	display_id: number
	status: string
	email: string | null
	total: number
	created_at: string
	customer_id: string
	customer: AdminStatisticsRecentOrderCustomer | null
}

export type AdminStatisticsRecentOrdersResponse = {
	orders: AdminStatisticsRecentOrder[]
}

// The route backing this response queries `entity: 'stock_lot'` for lot-level
// enrichment, a model owned by the separate `medusa-plugin-tracing` package.
// This plugin does NOT depend on medusa-plugin-tracing, so lot data may not be
// available (see the route's `lotDataAvailable` detection + fallback logic in
// `src/api/admin/statistics/low-stock/route.ts`). `lot_data_available` on the
// response tells a consumer which mode produced the `warnings` array:
//   - `true`  -- lot-level detail was queried; `reason: 'no_lots'` is possible
//     (an item/location has zero enabled stock lots) alongside `'low_stock'`
//     (enabled lots summed below threshold).
//   - `false` -- lot data was not available (medusa-plugin-tracing isn't
//     registered, or its query failed); `warnings` falls back to the inventory
//     item's own `location_levels.stocked_quantity` and only ever reports
//     `reason: 'low_stock'` -- "no lots" can't be distinguished without lot data.
// Either way the route returns 200 with real inventory-level data; it never
// hard-fails just because the unrelated tracing plugin isn't installed.
export type AdminStatisticsLowStockWarning = {
	inventory_item_id: string
	sku: string | null
	title: string | null
	location_name: string
	location_id: string
	reason: 'no_lots' | 'low_stock'
	available_quantity: number
}

export type AdminStatisticsLowStockResponse = {
	warnings: AdminStatisticsLowStockWarning[]
	lot_data_available: boolean
}

export type AdminStatisticsLayoutItem = {
	widget_id: string
	x: number
	y: number
	w: number
	h: number
	visible: boolean
}

// GET /admin/statistics/layout -- `layout` is null until a user has ever saved one.
export type AdminStatisticsLayoutResponse = {
	layout: AdminStatisticsLayoutItem[] | null
}

// POST /admin/statistics/layout -- echoes back the saved layout, never null.
export type AdminSaveStatisticsLayoutResponse = {
	layout: AdminStatisticsLayoutItem[]
}

export type AdminRecalculateStatisticsResponse = {
	success: boolean
}
