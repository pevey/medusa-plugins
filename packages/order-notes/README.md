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

To ensure order notes cannot be queried in GET requests to the storefront API, add 'order_note' to your restricted fields in `medusa-config.ts`.

```ts
module.exports = defineConfig({
	projectConfig: {
		// ... other settings
		http: {
			// ... other settings
			restrictedFields: {
				store: ['order_note']
			}
		}
	}
})
```

## Usage

- Navigate to any Order detail page in the Medusa admin.
- Use the Order Notes widget to add, view, and delete notes.
- Check "Send to customer" when creating a note to trigger an email notification.
