## 1.0.0

- Translatable fields support
- Hybrid matching on queries: Long fields (product descriptions, custom content bodies) are now matched with Postgres full-text search (`tsvector`/`ts_rank`) alongside `pg_trgm` typo-tolerant matching on short fields (names).

## 0.1.3

- Added loader function to run the job to generate search documents when starting the plugin for the first time
- Added README

## 0.1.0

- Initial release
