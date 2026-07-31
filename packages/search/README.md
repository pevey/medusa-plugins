# medusa-plugin-search

Full-site search for Medusa v2 on your existing Postgres database — no external search service. Short fields (product names) are matched with typo-tolerant `pg_trgm`; long fields (descriptions, blog/page bodies) with Postgres full-text search (`tsvector`). Product search is on by default, with opt-in category and collection sources, plus a `SearchSource` interface for indexing anything else (blog posts, help articles, custom content). When Medusa's Translation module is enabled, results can be served per-locale.

[Documentation](https://pevey.com/medusa-plugin-search)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Hybrid matching: typo-tolerant `pg_trgm` word-similarity on short fields + `tsvector` full-text (stemming, stop-words, `ts_rank`) on long bodies, combined into one score
- Opt-in per-locale search via Medusa's Translation module, with an unconditional fallback to the base document
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

## How matching works

Each `search_document` has two searchable projections:

- **`primary_text`** — short/name-like text (product title + variant option values). Matched with `pg_trgm` word-similarity, so it is typo-tolerant ("yirgachefe" → "Yirgacheffe").
- **`body_text`** — long content (full product description, blog/page body). Indexed as a `tsvector` and matched with Postgres full-text search, so it stems ("roasting" ↔ "roast"), drops stop-words, and ranks with `ts_rank`.

A single query scores every hit by the **better of the two lanes** — there is no "try one then the other" fallback. `pg_trgm` is language-agnostic; the `tsvector` lane uses a text-search configuration you choose (see `defaultLanguage`).

### Plugin options

| Option                    | Type                                                | Default    | Description                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sources`                 | `Array<'category' \| 'collection' \| SearchSource>` | `[]`       | Sources to index in addition to `product`, which is always on. Strings enable the matching built-in source. Objects register a custom source (see `SearchSource` below).                                                                                                                                                                                                                    |
| `weights`                 | `Record<string, number>`                            | `{}`       | Per-source score multiplier keyed by `SearchSource.type`. Missing entries default to `1`. Use values `< 1` to demote a source relative to products, `> 1` to boost it.                                                                                                                                                                                                                      |
| `wordSimilarityThreshold` | `number`                                            | `0.3`      | Minimum `pg_trgm.word_similarity_threshold` for a document to match. Lower = more typo-tolerant but more noise; higher = tighter but more misses. Applied as `SET LOCAL` inside each search transaction.                                                                                                                                                                                    |
| `limit`                   | `number`                                            | `12`       | Default result limit when the store `GET /store/search` request omits `limit`. The store endpoint caps user-supplied `limit` at 25 regardless.                                                                                                                                                                                                                                              |
| `defaultLanguage`         | `string`                                            | `'simple'` | Postgres text-search config name for the base `tsvector` lane — e.g. `'english'`, `'spanish'`, or a custom config (**not** a locale code like `es-ES`). List valid names with `SELECT cfgname FROM pg_ts_config;`. Omitted or invalid → `'simple'` (tokenize only, no stemming). Medusa doesn't record what language your base content is in, so set this to that language to get stemming. |
| `bodyWeight`              | `number`                                            | `1.0`      | Multiplier applied to the `tsvector` (full-text) lane's normalized score before it competes with the `pg_trgm` lane. Lower to demote long-body matches relative to name matches.                                                                                                                                                                                                            |
| `localeTextSearchConfig`  | `Record<string, string>`                            | `{}`       | Overrides/extends the built-in BCP-47 → Postgres config mapping used for translated documents, e.g. `{ 'pt-BR': 'portuguese' }`. Unmapped locales use `'simple'`.                                                                                                                                                                                                                           |
| `translations`            | `boolean`                                           | auto       | Force the translation path on/off. When unset, it is auto-detected from the presence of the Translation module. See **Translations** below.                                                                                                                                                                                                                                                 |

NOTE: The defaultLanguage options as of Postgres 18.4 are: arabic, armenian, basque, catalan, danish, dutch, english, finnish, french, german, greek, hindi, hungarian, indonesian, irish, italian, lithuanian, nepali, norwegian, portuguese, romanian, russian, serbian, spanish, swedish, tamil, turkish, yiddish |

### Custom sources

A `SearchSource` describes how to project one Medusa entity into a `search_document` row:

```ts
type SearchSource = {
	type: string // stable identifier, also the key for `weights`
	entity: string // Query graph entity name (e.g. 'product_category')
	fields: string[] // fields fetched during full reindex
	reindexFilters?: Record<string, unknown> // graph filters applied during reindex
	translationReference?: string // Translation module `reference` (table name); defaults to `entity`
	visibility: (row: any) => boolean // return false to exclude a row from the index
	buildDocument: (row: any) => SearchDocumentInput
}
```

`buildDocument` returns a `SearchDocumentInput`: put short/name-like text in `primary_text` (the `pg_trgm` lane) and long content in `body_text` (the `tsvector` lane). `body_text` is optional; leave it null for sources with no long content.

Register the source in `options.sources` and wire subscribers for its lifecycle events using `searchSourceSubscriber(type)` from the plugin export.

## How the index stays in sync

The plugin ships subscribers that reindex on write:

- **Products** — `product.created|updated|deleted`, `product-variant.created|updated`, `product-option.created|updated`. Variant and option events resolve back to the parent product and reindex it.
- **Categories** — `product_category.created|updated|deleted` when `category` is enabled.
- **Collections** — `product_collection.created|updated|deleted` when `collection` is enabled.
- **Custom sources** — use `searchSourceSubscriber(type)` to subscribe to whatever events your entity emits.

## Translations

If Medusa's [Translation module](https://docs.medusajs.com/resources/commerce-modules/translation) is enabled (`featureFlags: { translation: true }` + the `@medusajs/medusa/translation` module), the plugin indexes translated content automatically:

- On index, for each entity it asks the Translation module which locales actually have a translation (`listTranslations`) and writes one `search_document_translation` row per translated locale — nothing is written for locales that would merely fall back to the base content.
- A subscriber on `translation.created|updated|deleted` keeps those rows in sync.
- `GET /store/search?q=<term>&locale=<code>` (or the `x-medusa-locale` header) returns localized titles/snippets. Matching is **exact `locale_code`** — `es-MX` does not borrow `es-ES` translations.

**The base document is always the floor.** Passing a `locale` never removes results: if the locale isn't activated, the entity isn't translated, or translations aren't enabled at all, the base document is returned. `locale` is safe to pass unconditionally from a storefront.

Detection is automatic — stores without the Translation module behave exactly as before, with no per-request overhead. Use the `translations` option to force the behavior (`true`/`false`) if needed. Custom translatable models opt in the same way core models do, with the `.translatable()` modifier; set `translationReference` on your `SearchSource` if the Query-graph entity name differs from the translation table name.

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

- Search from the storefront: `GET /store/search?q=<term>&limit=<n>&locale=<code>`. The publishable key on the request scopes results to the caller's sales channels; `locale` is optional (see **Translations**).
- Reindex on demand: `POST /admin/search/reindex`.
- Register custom sources via the plugin's exported `SearchSource` type and `searchSourceSubscriber` helper.
