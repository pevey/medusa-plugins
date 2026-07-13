# medusa-plugin-search

Typo-tolerant full-site search for Medusa v2 using Postgres `pg_trgm`. Product search is on by default, with opt-in category and collection sources, plus a `SearchSource` interface for indexing anything else (blog posts, help articles, custom content).

[Documentation](https://pevey.com/medusa-plugin-search)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Typo-tolerant word-similarity search over an indexed `search_document` table using Postgres `pg_trgm`
- Product search built in; opt-in built-in sources for `category` and `collection`
- Bring-your-own `SearchSource` for custom entities (blog posts, docs, help articles, etc.)
- Per-source weight tuning for scoring
- Sales channel scoping — hits are filtered by the calling publishable key's channels
- Subscribers keep the index in sync with `product.*`, `product-variant.*`, `product-option.*`, `product_category.*`, and `product_collection.*` events
- Nightly reindex scheduled job
- Auto-seed on first boot when the index is empty (worker mode only, fire-and-forget)
- Admin API endpoint to trigger a full reindex on demand
- Store API endpoint `GET /store/search`

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-search
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

The plugin's migration creates the `search_document` table and enables the `pg_trgm` extension — no manual database setup required.

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-search',
			options: {}
		}
		// ... other plugins
	]
})
```

With no options, the plugin indexes published products only. To also index categories and collections:

```ts
{
	resolve: 'medusa-plugin-search',
	options: {
		sources: ['category', 'collection']
	}
}
```

To register a custom source alongside the built-ins:

```ts
import { contentSource } from './src/lib/search-sources/content'

// ...

{
	resolve: 'medusa-plugin-search',
	options: {
		sources: ['category', 'collection', contentSource],
		weights: { product: 1, category: 0.8, collection: 0.8, content: 0.6 },
		wordSimilarityThreshold: 0.3,
		limit: 12
	}
}
```

### Plugin options

| Option                    | Type                                            | Default | Description                                                                                                                                                                                                                                     |
| ------------------------- | ----------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sources`                 | `Array<'category' \| 'collection' \| SearchSource>` | `[]`    | Sources to index in addition to `product`, which is always on. Strings enable the matching built-in source. Objects register a custom source (see `SearchSource` below).                                                                        |
| `weights`                 | `Record<string, number>`                        | `{}`    | Per-source score multiplier keyed by `SearchSource.type`. Missing entries default to `1`. Use values `< 1` to demote a source relative to products, `> 1` to boost it.                                                                          |
| `wordSimilarityThreshold` | `number`                                        | `0.3`   | Minimum `pg_trgm.word_similarity_threshold` for a document to match. Lower = more typo-tolerant but more noise; higher = tighter but more misses. Applied as `SET LOCAL` inside each search transaction.                                       |
| `limit`                   | `number`                                        | `12`    | Default result limit when the store `GET /store/search` request omits `limit`. The store endpoint caps user-supplied `limit` at 25 regardless.                                                                                                  |

### Custom sources

A `SearchSource` describes how to project one Medusa entity into a `search_document` row:

```ts
type SearchSource = {
	type: string                            // stable identifier, also the key for `weights`
	entity: string                          // Query graph entity name (e.g. 'product_category')
	fields: string[]                        // fields fetched during full reindex
	reindexFilters?: Record<string, unknown> // graph filters applied during reindex
	visibility: (row: any) => boolean       // return false to exclude a row from the index
	buildDocument: (row: any) => SearchDocumentInput
}
```

Register the source in `options.sources` and wire subscribers for its lifecycle events using `searchSourceSubscriber(type)` from the plugin export.

## How the index stays in sync

The plugin ships subscribers that reindex on write:

- **Products** — `product.created|updated|deleted`, `product-variant.created|updated`, `product-option.created|updated`. Variant and option events resolve back to the parent product and reindex it.
- **Categories** — `product_category.created|updated|deleted` when `category` is enabled.
- **Collections** — `product_collection.created|updated|deleted` when `collection` is enabled.
- **Custom sources** — use `searchSourceSubscriber(type)` to subscribe to whatever events your entity emits.

## Initial seed on startup

On the first boot after installation the `search_document` table is empty and search returns nothing until the nightly reindex runs. To avoid that gap, the plugin registers a module loader that seeds the index at startup:

- Runs on every process boot, but only in `WORKER_MODE=worker` or `WORKER_MODE=shared` — never on `server`-only processes, so multi-instance deployments won't race.
- No-op if any `search_document` rows already exist, so repeated boots are cheap.
- No-op if the table doesn't exist yet (e.g. before the plugin's migration has been applied).
- Fire-and-forget — the reindex runs in the background via `setImmediate` so it never delays app startup, even on large catalogs.

Success and failure are logged with the `[search]` prefix:

```
[search] no documents found, seeding search index in background...
[search] initial seed done in 12483ms: {"product":842,"category":37}
```

## Nightly reindex job

A scheduled job at `0 3 * * *` (03:00 daily, server time) runs the same full reindex workflow. This reconciles anything the event-driven subscribers may have missed — bulk imports outside Medusa, migrations, entity changes made while an instance was offline. Like the startup seed, it only runs on worker processes (this is enforced by Medusa's job scheduler, not by the plugin).

## Manual reindex

Trigger the same reindex workflow at any time from the admin:

```
POST /admin/search/reindex
```

The response returns the per-source document counts.

## Usage

- Search from the storefront: `GET /store/search?q=<term>&limit=<n>`. The publishable key on the request scopes results to the caller's sales channels.
- Reindex on demand: `POST /admin/search/reindex`.
- Register custom sources via the plugin's exported `SearchSource` type and `searchSourceSubscriber` helper.
