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
