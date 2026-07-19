# medusa-plugin-statistics

A plugin to add dashboard statistics with daily aggregation and customizable widgets to Medusa v2.

[Documentation](https://pevey.com/medusa-plugin-statistics)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Daily aggregation job that writes one summary row per calendar day (UTC): revenue, order count, average order value, new vs returning customers, pending fulfillment, low-stock count, and a top-products snapshot
- A top-level **Statistics** admin page with Today / This Week / This Month views
- Eight dashboard widgets on a `react-grid-layout` grid — drag to reorder, resize, and show/hide
- Per-admin-user layout: each user customizes and saves their own dashboard arrangement
- Live widgets for recent orders and inventory warnings that read straight from your data
- One-click **Recalculate** to backfill history from existing orders
- Runs entirely on your Postgres database — no external analytics service, no third-party calls

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-statistics
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

After installing the plugin, you must run Medusa's migration tool to create the `statistics_daily` table.

```bash
yarn medusa db:migrate
```

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-statistics',
			options: {}
		}
		// ... other plugins
	]
})
```

The plugin currently takes **no options** — installing it registers the Statistics module, the daily job, the admin page, and its API routes. Tunable values (the daily-job's low-stock threshold, the period windows, and the recalculate lookback) are fixed defaults today rather than configurable options.

## The Statistics dashboard

The plugin adds a top-level **Statistics** entry to the admin sidebar (`/app/statistics`). The page has:

- A **period toggle** — Today, This Week (last 7 days), or This Month (last 30 days).
- A **Recalculate** button that backfills the aggregate table from your existing orders (see [Recalculating](#recalculating)).
- A **Customize** button that enters edit mode. In edit mode you can drag widgets by their handle, resize them, and toggle visibility, then **Save Layout** (or Cancel).

Your saved arrangement is stored on your own admin-user record, so each user gets their own dashboard layout. (Layout is persisted for the large/desktop breakpoint; smaller breakpoints use sensible defaults.)

### Widgets

| Widget                  | Shows                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Revenue**             | Area chart of daily revenue across the period, plus the period total                                                                |
| **Orders**              | Bar chart of daily order count, plus the period total                                                                               |
| **Avg Order Value**     | Line chart of daily average order value (needs more than one day to plot a line)                                                    |
| **Top Products**        | Horizontal bar chart of the best-selling products by units sold across the period                                                   |
| **Recent Orders**       | Live list of the newest orders, each linking to its order detail page                                                               |
| **Customers**           | Donut of new vs returning customers for the period                                                                                  |
| **Pending Fulfillment** | Current count of orders awaiting fulfillment, with a color-coded badge                                                              |
| **Inventory Warnings**  | Live list of inventory items that are out of stock lots or below the low-stock threshold, each linking to its inventory detail page |

The Revenue, Orders, Avg Order Value, Top Products, and Customers widgets read from the aggregated `statistics_daily` rows. Recent Orders and Inventory Warnings query your live data on each load.

## Daily aggregation

A scheduled job (`update-statistics`, cron `0 1 * * *` — 01:00 UTC daily) computes the previous day's summary and upserts it into `statistics_daily`. Like all Medusa scheduled jobs, it runs on worker processes (`WORKER_MODE=worker` or `shared`).

For each UTC day it records:

- `revenue_total` — sum of `order.total` for the day (canceled orders are excluded)
- `order_count` — number of non-canceled orders placed that day
- `average_order_value` — `revenue_total / order_count`
- `new_customer_count` — customers first created that day
- `returning_customer_count` — customers who ordered that day and were created before it
- `pending_fulfillment_count` — current count of orders not yet completed/canceled/archived
- `low_stock_count` — current count of inventory items at or below the low-stock threshold
- `top_products` — the day's top 10 products by units sold (`{ product_id, title, quantity_sold }`)

`pending_fulfillment_count` and `low_stock_count` are **current snapshots** taken when the job runs, not historical values — they reflect the state of your store at aggregation time, so the dashboard reads them from the most recent day in the selected range rather than summing them.

## Data model

The plugin owns one table, `statistics_daily` — one row per calendar day:

| Field                       | Type        | Notes                                           |
| --------------------------- | ----------- | ----------------------------------------------- |
| `id`                        | text        | primary key                                     |
| `date`                      | timestamptz | the UTC day this row summarizes                 |
| `revenue_total`             | float       | sum of order totals                             |
| `order_count`               | integer     | non-canceled orders                             |
| `average_order_value`       | float       | revenue ÷ orders                                |
| `new_customer_count`        | integer     | first-time customers created that day           |
| `returning_customer_count`  | integer     | returning customers who ordered that day        |
| `pending_fulfillment_count` | integer     | snapshot at aggregation time                    |
| `low_stock_count`           | integer     | snapshot at aggregation time                    |
| `top_products`              | jsonb       | array of `{ product_id, title, quantity_sold }` |
| `metadata`                  | jsonb       | free-form, nullable                             |

## Recalculating

A fresh install has no history until the nightly job runs, so charts start empty. Backfill immediately with the **Recalculate** button on the dashboard, or:

```
POST /admin/statistics/recalculate
```

Recalculate recomputes every day from your earliest existing `statistics_daily` row (or the last 30 days if there are none) through today, so it both seeds a new install and repairs gaps — bulk imports, orders placed while a worker was offline, or historical corrections.

## API endpoints

All endpoints are under `/admin/statistics` and require an authenticated admin session.

| Method & path                         | Purpose                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /admin/statistics`               | Daily rows and computed totals for a window. Query: `period` (`today` \| `week` \| `month`, default `week`), or an explicit `start_date` / `end_date`. Returns `{ statistics, totals, period }`. |
| `POST /admin/statistics/recalculate`  | Backfill/repair the aggregate table (see [Recalculating](#recalculating)). Returns `{ success: true }`.                                                                                          |
| `GET /admin/statistics/recent-orders` | Newest orders for the Recent Orders widget. Query: `limit` (1–50, default 10). Returns `{ orders }`.                                                                                             |
| `GET /admin/statistics/low-stock`     | Inventory warnings for the Inventory Warnings widget — items with no enabled stock lots, or total enabled stock below `threshold` (default 10). Returns `{ warnings }`.                          |
| `GET /admin/statistics/layout`        | The current admin user's saved widget layout, or `null`. Returns `{ layout }`.                                                                                                                   |
| `POST /admin/statistics/layout`       | Save the current admin user's widget layout (`{ layout: [{ widget_id, x, y, w, h, visible? }] }`). Returns `{ layout }`.                                                                         |

## Notes

- **All day boundaries are UTC.** Buckets are computed with UTC midnight, so if your business operates in another timezone the day cutoffs will not match your local calendar day.
- **No multi-currency handling.** Revenue sums `order.total` across all orders regardless of currency, and amounts render with a `$` prefix. On a single-currency store this is correct; on a multi-currency store the totals will mix currencies.
- **Canceled orders are excluded** from revenue, order counts, and top-products.

## Usage

- Open **Statistics** in the admin sidebar and pick a period.
- Click **Recalculate** once after installing (or after a bulk import) to backfill history.
- Click **Customize** to rearrange, resize, and show/hide widgets, then **Save Layout** — the arrangement is saved to your admin user.
