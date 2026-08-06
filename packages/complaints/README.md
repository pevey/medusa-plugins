# medusa-plugin-complaints

Complaint management plugin for Medusa v2. Track, tag, and manage customer complaints with activity logging and product-level statistics.

[Documentation](https://pevey.com/medusa-plugin-complaints)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Full complaint CRUD with open/closed status workflow
- Tagging system for categorizing complaints
- Activity tracking
- Widgets on Order, Customer, and Product detail pages
- Product-level complaint rate statistics with scheduled recalculation

## Background

Some regulated industries require companies to formally log complaints. This plugin allows you to do that within your Medusa admin dashboard. Complaints can be initiated from order pages with customer and order prefilled. Complaint activity (closing complaints, adding notes) is recorded by Medusa user id. Optionally allows creating tags and assigning tags to complaints to facilitate data analysis. Complaint statistics by product are generated daily via a scheduled job.

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-complaints
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
			resolve: 'medusa-plugin-complaints',
			options: {}
		}
		// ... other plugins
	]
})
```

### Keeping complaints out of store field expansion

Complaints cannot be fetched via the store api by default when [medusa-plugin-access](https://pevey.com/medusa-plugin-access) is installed. This plugin automatically declares them as restricted on `/store` routes. They are silently dropped if requested, so they cannot be reached through field expansion on other entities (e.g. `?fields=complaint` on a customer or order).

To expose complaint relations to store field expansion instead, opt out:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-complaints',
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
				store: ['complaint', 'complaints']
			}
		}
	}
})
```

## Usage

- Create and manage complaints from the Complaints section in the Medusa admin sidebar.
- Define complaint tags in Settings > Complaint Tags.
- Widgets on Order, Customer, and Product pages show related complaints at a glance.
- Product complaint statistics are recalculated daily via a scheduled job.
