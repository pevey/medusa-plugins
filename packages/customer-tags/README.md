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

After installing the plugin, you must run Medusa's migration tool to create the plugin's database tables.

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
			resolve: 'medusa-plugin-customer-tags',
			options: {}
		}
		// ... other plugins
	]
})
```

### Keeping tags out of store responses

Customer tags cannot be fetched via the store api by default when [medusa-plugin-access](https://pevey.com/medusa-plugin-access) is installed. This plugin automatically declares them as restricted on `/store` routes. They are silently dropped if requested, so they cannot be reached through field expansion on other entities (e.g. `?fields=customer_tag` on a customer or order).

To expose tags to store clients instead, opt out:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-customer-tags',
			options: {
				adminOnly: false
			}
		}
	]
})
```

**Without medusa-plugin-access**, the declaration is a no-op, and you rely on Medusa's own mechanisms. Since Medusa 2.21, these cover the core store routes. Every core store route that can return customers has a list of allowed fields, and a relation that is not on the list is silently stripped from the response. Customer tags are not on any of those lists, so core hides them by default.

Add `http.restrictedFields` as a second layer for store routes that have no allowed-fields list, such as routes added by your own code or other plugins that use Medusa's query validation.

Neither mechanism applies to Medusa's opt-in `POST /store/search` endpoint. It returns whatever fields the client asks it to hydrate. If you expose a customer index through `configureStoreSearch`, a request for `customer_tags.*` returns the linked records. medusa-plugin-access strips them from that response too.

```ts
// medusa-config.ts
module.exports = defineConfig({
	projectConfig: {
		// ... other settings
		http: {
			// ... other settings
			restrictedFields: {
				store: ['customer_tag', 'customer_tags']
			}
		}
	}
})
```

- Define new Customer Tags in the Settings page of the Medusa admin.
- On a Customer detail page, use the widget to associate one or more tags with a customer.
