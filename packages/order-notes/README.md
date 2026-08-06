# medusa-plugin-order-notes

Order notes plugin adding Medusa v1-style notes for Medusa v2. Add internal notes to orders and optionally send them to customers via email.

[Documentation](https://pevey.com/medusa-plugin-order-notes)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Add notes to any order from the Order detail page
- Option to mark notes as "send to customer" for email notification
- Widget on Order detail page displaying all notes with timestamps
- Delete notes when no longer needed
- Filterable by order ID via the admin API

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-order-notes
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
			resolve: 'medusa-plugin-order-notes',
			options: {}
		}
		// ... other plugins
	]
})
```

### Keeping notes out of store responses

Order notes cannot be fetched via the store api by default when [medusa-plugin-access](https://pevey.com/medusa-plugin-access) is installed. This plugin automatically declares them as restricted on `/store` routes. They are silently dropped if requested, so they cannot be reached through field expansion on other entities (e.g. `?fields=order_note` on an order).

To expose notes to store clients instead, opt out:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-order-notes',
			options: {
				adminOnly: false
			}
		}
	]
})
```

**Without medusa-plugin-access**, the declaration is a no-op, and you must rely on Medusa's own mechanism — with an important caveat: as of Medusa 2.18, `http.restrictedFields` is only enforced when the undocumented `MEDUSA_FF_RBAC_FILTER_FIELDS` feature flag is enabled. Setting the config alone does nothing.

```ts
// medusa-config.ts — ALSO requires MEDUSA_FF_RBAC_FILTER_FIELDS=true in your environment
module.exports = defineConfig({
	projectConfig: {
		// ... other settings
		http: {
			// ... other settings
			restrictedFields: {
				store: ['order_note', 'order_notes']
			}
		}
	}
})
```

## Usage

- Navigate to any Order detail page in the Medusa admin.
- Use the Order Notes widget to add, view, and delete notes.
- Check "Send to customer" when creating a note to trigger an email notification.
