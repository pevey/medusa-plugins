# medusa-plugin-veeqo

Veeqo integration plugin for Medusa v2. Automatically send placed orders to Veeqo for shipping, ping Veeqo for updates on orders, and create Medusa fulfillments when items are shipped.

[Documentation](https://pevey.com/medusa-plugin-veeqo)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

If you are not familiar with Veeqo, you can learn more on their [web site](https://www.veeqo.com/).

## Features

- Syncs from Medusa to Veeqo all required entities to send orders to Veeqo via their API (sales channels, stock locations, shipping options, products, product variants, and customers)
- Automatically sends orders to Veeqo for fulfillment
- Pings Veeqo every 4 hours for updates via a scheduled Job
- Automatically creates a Medusa fulfillment when a Veeqo shipment is detected. Stores tracking and delivery information in Medusa.
- Triggers the 'shipment.created' and 'delivery.created' events for easy integration with your notifications flow.
- Supports Medusa Claims (with Replace action) and Exchanges by automatically creating new Veeqo orders for replacement shipments — Veeqo refuses additional shipments on a shipped order, so a single Medusa order can correspond to multiple Veeqo orders over its lifetime.

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-veeqo
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your medusa-config.ts file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-veeqo',
			options: {
				apiKey: process.env.VEEQO_API_KEY,
				timeout: 5000,
				retry: 3
			}
		}
		// ... other plugins
	]
})
```

### Options

| Option     | Type     | Required | Default                 | Description                                  |
| ---------- | -------- | -------- | ----------------------- | -------------------------------------------- |
| `apiKey`   | `string` | Yes      |                         | Your Veeqo API key                           |
| `timeout`  | `number` | No       | `5000`                  | Request timeout in milliseconds              |
| `retry`    | `number` | No       | `3`                     | Number of retry attempts for failed requests |
| `veeqoUrl` | `string` | No       | `https://api.veeqo.com` | Override Veeqo API URL if desired            |

## Admin UI

The plugin adds widgets to the following admin pages:

- **Products** - View and sync Veeqo product/sellable mappings
- **Orders** - View Veeqo order and shipment status
- **Customers** - View Veeqo customer mapping
- **Sales Channels** - View Veeqo channel mapping
- **Stock Locations** - View Veeqo warehouse mapping
- **Shipping Options** - View Veeqo delivery method mapping

A settings page at **Settings > Veeqo** provides a guided setup wizard for initial sync of all entity types. Revisit this wizard any time to check for items that may have been added since setup that need to be synced.

## Replacement orders (claims & exchanges)

When a Medusa Claim with a Replace action or an Order Exchange is created, this plugin automatically creates a new Veeqo order for the outbound replacement shipment. This is necessary because Veeqo does not allow additional shipments on an order after that order has been shipped — replacements must be in their own Veeqo order.

A single Medusa order can therefore correspond to multiple Veeqo orders over its lifetime:

- One for the original placement (`source_type = 'order_placed'`)
- One per claim with replacement items (`source_type = 'claim'`)
- One per exchange (`source_type = 'exchange'`)

Refund-only claims (no `additional_items`) do not produce a Veeqo order.

Internal notes in Veeqo's UI reference the parent Veeqo order id and the Medusa claim/exchange id, distinguishing replacement orders from original placements.

### Manual retry

Orders with failed syncs can be detected by:

```sql
SELECT * FROM veeqo_order
WHERE veeqo_order_id IS NULL OR last_sync_error IS NOT NULL;
```

Two endpoints are available for retry:

```
POST /admin/veeqo/sync
Body: { source_type, source_id, order_id? }
```

`order_id` is required when `source_type` is `claim` or `exchange`.

```
POST /admin/veeqo/orders/:orderId/replacements/sync
```

The bulk endpoint retries every claim/exchange on the order that is currently unhealthy.
