# medusa-plugin-customer-tags

Associate custom labels with customers and display them prominently on Order and Customer detail pages for easy reference.

[Documentation](https://pevey.com/medusa-plugin-customer-tags)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Can create any number of pre-defined customer tags
- Widget on Customer detail page to easily associate customers with one or more tags
- Displays tags prominently on in a widget at the top of Order detail pages
- Examples: 'VIP' or 'Frequent returns' or 'Prefers chocolate'. Whatever data suits your store that people in your org interacting with customers might want to have easy reference to.

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-customer-tags
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-customer-tags',
			options: {}
		}
		// ... other plugins
	]
})
```

If your Medusa backend is not behind a firewall and you want to prevent customer tags from being requested in GET requests to the API, add 'customer_tag' to your restricted fields in `medusa-config.ts`.

```ts
module.exports = defineConfig({
	projectConfig: {
		// ... other settings
		http: {
			// ... other settings
			restrictedFields: {
				store: ['customer_tag']
			}
		}
	}
})
```

- Define new Customer Tags in the Settings page of the Medusa admin.
- On a Customer detail page, use the widget to associate one or more tags with a customer.
