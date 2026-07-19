# medusa-plugin-analytics

Customer analytics for a Medusa v2 store that is completely self-hosted within Medusa itself. Enables insights and funnel metrics without sending customer data to a third-party.

[Documentation](https://pevey.com/medusa-plugin-analytics)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- **Fully self-hosted** — every event, visitor, and metric lives in your store's own Postgres. No data leaves your infrastructure and no third-party analytics service is involved.
- **Privacy-first** — no cookies are set by the plugin, and events store no IP address or user-agent. Visitors are keyed by a server-owned anonymous id, not personal data.
- **Automatic backend commerce tracking** — a subscriber captures order, cart, customer, return, and shipment events with no storefront work required.
- **Storefront event ingestion** through a public `POST /store/ping` endpoint, scoped to a sales channel by the caller's publishable API key.
- **Event rubrics** — an allow-list of the storefront event names you accept (with their expected properties), managed from the admin. Unknown event names are dropped at ingest.
- **Identity stitching** — anonymous visitors are merged into known customers, and their earlier events are re-attributed.
- **Conversion funnels** — build ordered, multi-step funnels and view distinct-actor conversion in the dashboard.
- **Customer segments** — rule-based segments (event performed / not performed / identity property) with live preview and CSV export.
- **Nightly rollups** (daily event counts + unique actors) and **automatic 90-day retention** of raw events.
- **Admin dashboard** with 7 / 30 / 90-day views, funnel configuration, and rubric management.
- A companion browser event batcher (`createCollector`) ships in the `medusa-js-sdk` package for wiring your storefront.

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-analytics
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

After installing the plugin, you must run Medusa's migration tool to create the plugin's database tables.

```bash
yarn medusa db:migrate
```

## Configuration

This package is two things at once: a **plugin** (its API routes, admin dashboard, migrations, subscribers, jobs, and storage module) and a **provider** for Medusa's Analytics Module (so tracked events are stored privately instead of sent to a third party). Register **both** in your `medusa-config.ts`:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-analytics',
			options: {}
		}
		// ... other plugins
	],
	modules: [
		{
			resolve: '@medusajs/medusa/analytics',
			options: {
				providers: [
					{
						resolve: 'medusa-plugin-analytics',
						id: 'private'
					}
				]
			}
		}
		// ... other modules
	]
})
```

The `plugins` entry loads the routes, admin UI, migrations, subscribers, jobs, and the storage module. The `modules` entry registers this package as the provider for Medusa's Analytics Module — that is what routes tracked events (including storefront `/store/ping` events and Medusa's own analytics events) into your database. Both entries are required.

## Usage

### Backend commerce events (automatic)

Once registered, a subscriber records order, cart, customer, return, and shipment events for you — no storefront changes needed. Order events carry the order total and items, and anonymous carts are stitched to the customer once known.

### Storefront events

Send storefront activity (page views, custom events) to the public ingest endpoint:

```
POST /store/ping
```

Requests are scoped to a sales channel by the publishable API key on the request. The body is a single event or an array (up to 100):

```json
{ "event": "page_viewed", "session_id": "…", "properties": { "path": "/products/abc" } }
```

The `medusa-js-sdk` package ships `createCollector`, a small batching browser client that buffers events and flushes them (using `sendBeacon` on page hide), which you can point at your ingest route — or you can `POST` directly.

**Events must be allow-listed.** Built-in commerce events are always accepted, but any custom event name (such as `page_viewed`) is dropped at ingest unless an **active rubric** exists for it. Create rubrics under **Analytics → Manage Events** in the admin.

### The dashboard

Everything is under the **Analytics** section in the admin sidebar:

- **Dashboard** — the conversion funnel chart, with a 7 / 30 / 90-day period selector. Create a funnel and mark it **default** to populate this view.
- **Funnel configuration** — build an ordered list of steps from your rubrics.
- **Event rubrics** — define and manage which storefront events are accepted, and inspect recent events per rubric.

### Reporting endpoints

For custom dashboards or exports, the admin API exposes:

- `GET /admin/analytics/events` — raw events, filterable by event, actor, source, sales channel, and date range.
- `GET /admin/analytics/events/counts` — time-bucketed counts (`hour` / `day` / `week`).
- `GET /admin/analytics/funnel` — computed conversion results for a funnel.
- `GET /admin/analytics/segments/:id/export` — a segment's members as CSV.
