# medusa-plugin-content

A headless CMS plugin for Medusa v2. Manage content collections, items, creators, tags, and relationships from the Medusa admin dashboard.

[Documentation](https://pevey.com/medusa-plugin-content)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Create content collections with configurable formats (HTML, Markdown, JSON, plain text, images)
- Full CRUD for content items with draft/published/archived status workflow
- Dynamic schema fields per collection (text, number, boolean, date, select, multiselect, rich text, image)
- Content creators with activity tracking
- Tagging system for content items
- Relationships between collections (many-to-many, one-to-many, many-to-one)
- Content item linking across collections
- Markdown editor with toolbar in the admin UI
- Image gallery view with file upload support
- Activity logging for content items and creators (edits, status changes, notes)
- Public store API with built-in caching for content delivery
- Product detail page widget for adding images to products from your content collection(s)

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-content
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-content',
			options: {}
		}
		// ... other plugins
	]
})
```

## Usage

- Create and manage content collections from the Content section in the Medusa admin sidebar.
- Define custom fields per collection to create structured content schemas.
- Add content items to collections, assign creators, and manage publication status.
- Use the public store API to fetch published content for your storefront.
