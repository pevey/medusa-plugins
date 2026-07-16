import { MedusaService, Modules } from '@medusajs/framework/utils'
import SearchDocument from './models/search-document'
import SearchDocumentTranslation from './models/search-document-translation'
import { buildRegistry } from './lib/sources'
import { SIMPLE, configForLocale } from './lib/text-search-config'
import type { SearchDocumentInput, SearchTranslationInput, SearchHit, SearchSource, PluginOptions } from './lib/types'

class SearchModuleService extends MedusaService({
	SearchDocument,
	SearchDocumentTranslation
}) {
	protected options_: PluginOptions
	protected registry_: Map<string, SearchSource>
	protected container_: any
	protected baseConfig_?: string

	// Medusa framework calls this after ALL modules finish loading. This is the earliest
	// safe point to resolve cross-module services (event_bus) and emit events that a
	// subscriber can catch — subscribers are also registered by the time this fires.
	__hooks = {
		onApplicationStart: async () => this.seedIndexIfEmpty()
	}

	constructor(container: any, options: PluginOptions = {}) {
		super(...arguments)
		this.container_ = container
		this.options_ = options ?? {}
		this.registry_ = buildRegistry(this.options_)
	}

	protected async seedIndexIfEmpty(): Promise<void> {
		const logger = this.container_.logger ?? console

		const workerMode = process.env.WORKER_MODE || 'shared'
		if (workerMode === 'server') return

		try {
			const existing = await this.listSearchDocuments({}, { take: 1 })
			if (existing.length > 0) return
		} catch (error) {
			// Table may not exist yet (fresh install before migrations); nothing to seed.
			logger.debug?.(`[search] seed check skipped: ${(error as Error).message}`)
			return
		}

		const eventBus = this.container_[Modules.EVENT_BUS]
		if (!eventBus) {
			logger.warn('[search] cannot seed on startup — event bus module is not configured')
			return
		}

		eventBus
			.emit({ name: 'search.seed-empty-index', data: {} })
			.catch((error: Error) => {
				logger.error(`[search] failed to emit initial-seed event: ${error.message}`)
			})
	}

	// Validate the configured base text-search config against pg_ts_config once. An unknown
	// name (or none) falls back to 'simple' rather than erroring at query time.
	protected async resolveBaseConfig(): Promise<string> {
		if (this.baseConfig_) return this.baseConfig_
		const requested = this.options_.defaultLanguage
		if (!requested) return (this.baseConfig_ = SIMPLE)
		const knex = (this as any).__container__.manager.getKnex()
		const { rows } = await knex.raw(`SELECT 1 FROM pg_ts_config WHERE cfgname = ?`, [requested])
		if (rows.length === 0) {
			const logger = this.container_.logger ?? console
			logger.warn?.(`[search] defaultLanguage '${requested}' is not a valid Postgres text search config; falling back to 'simple'`)
			return (this.baseConfig_ = SIMPLE)
		}
		return (this.baseConfig_ = requested)
	}

	protected bodyWeight(): number {
		const w = this.options_.bodyWeight
		return typeof w === 'number' && Number.isFinite(w) ? w : 1.0
	}

	// tsvector and fractional weight can't be written through the ORM (no tsvector DML type,
	// integer-rounding on numeric), so set them with one raw UPDATE after each ORM write.
	protected async writeBaseTsv(id: string, body_text: string | null | undefined, weight: number): Promise<void> {
		const cfg = await this.resolveBaseConfig()
		const knex = (this as any).__container__.manager.getKnex()
		await knex.raw(
			`UPDATE search_document SET body_tsv = to_tsvector(?::regconfig, coalesce(?, '')), weight = ?::numeric WHERE id = ?`,
			[cfg, body_text ?? '', weight, id]
		)
	}

	getSource(type: string): SearchSource | undefined {
		return this.registry_.get(type)
	}

	isSourceEnabled(type: string): boolean {
		return this.registry_.has(type)
	}

	// Explicit `translations: false` disables fan-out even when the module is present.
	isTranslationsDisabled(): boolean {
		return this.options_.translations === false
	}

	// Explicit `translations: true` forces the localized path even without module auto-detection.
	translationsForced(): boolean {
		return this.options_.translations === true
	}

	listSources(): SearchSource[] {
		return [...this.registry_.values()]
	}

	weightFor(type: string, fallback = 1): number {
		return this.options_.weights?.[type] ?? fallback
	}

	async search(term: string, limit?: number, channelIds: string[] = [], locale?: string): Promise<SearchHit[]> {
		const clean = term.trim()
		if (clean.length < 2) return []
		const effectiveLimit = limit ?? this.options_.limit ?? 12
		// SET does not accept bound params; threshold is a trusted number from options, so inline it safely.
		const rawThreshold = this.options_.wordSimilarityThreshold ?? 0.3
		const threshold = Number.isFinite(rawThreshold) ? Number(rawThreshold) : 0.3
		const baseCfg = await this.resolveBaseConfig()
		const bw = this.bodyWeight()

		const manager = (this as any).__container__?.manager
		if (!manager) throw new Error('Database manager not available')
		const knex = manager.getKnex()

		// Localized path when a locale is requested and translations aren't explicitly disabled.
		// The store route decides whether translations are active (only it can resolve the
		// translation module — this module's own container cannot) and passes a locale accordingly.
		const useLocale = !!locale && this.options_.translations !== false
		if (!useLocale) {
			return this.searchBaseOnly(knex, clean, channelIds, baseCfg, bw, threshold, effectiveLimit)
		}

		const locCfg = configForLocale(locale!, this.options_.localeTextSearchConfig)
		// UNION of two independently-indexed branches. The base branch is unconditional (a locale
		// never empties results); the translation branch overrides per entity only where matched.
		// Each branch uses its own regconfig, matching how its body_tsv was built.
		const sql = `
			WITH q AS (SELECT ?::text AS term, ?::text[] AS channel_ids, ?::regconfig AS bcfg, ?::regconfig AS lcfg, ?::float AS bw, ?::text AS loc)
			SELECT type, id, slug, group_slug, title, snippet, score FROM (
			  SELECT DISTINCT ON (type, id) type, id, slug, group_slug, title, snippet, score FROM (
			    SELECT b.type, b.entity_id AS id, b.slug, b.group_slug, b.title, b.snippet,
			           greatest(word_similarity(q.term, b.primary_text) * 1.0,
			                    ts_rank(b.body_tsv, websearch_to_tsquery(q.bcfg, q.term), 32) * q.bw) * b.weight AS score,
			           0 AS is_t
			    FROM search_document b, q
			    WHERE (q.term <% b.primary_text OR b.body_tsv @@ websearch_to_tsquery(q.bcfg, q.term))
			      AND (b.sales_channel_ids IS NULL OR b.sales_channel_ids && q.channel_ids)
			    UNION ALL
			    SELECT b.type, b.entity_id AS id, b.slug, b.group_slug, t.title, t.snippet,
			           greatest(word_similarity(q.term, t.primary_text) * 1.0,
			                    ts_rank(t.body_tsv, websearch_to_tsquery(q.lcfg, q.term), 32) * q.bw) * b.weight AS score,
			           1 AS is_t
			    FROM search_document_translation t
			    JOIN search_document b ON b.id = t.search_document_id, q
			    WHERE t.locale = q.loc
			      AND (q.term <% t.primary_text OR t.body_tsv @@ websearch_to_tsquery(q.lcfg, q.term))
			      AND (b.sales_channel_ids IS NULL OR b.sales_channel_ids && q.channel_ids)
			  ) u
			  ORDER BY type, id, is_t DESC, score DESC
			) ranked
			ORDER BY score DESC, title ASC
			LIMIT ?
		`
		const rows = await knex.transaction(async (trx: any) => {
			await trx.raw(`SET LOCAL pg_trgm.word_similarity_threshold = ${threshold}`)
			const result = await trx.raw(sql, [clean, channelIds, baseCfg, locCfg, bw, locale, effectiveLimit])
			return result.rows as SearchHit[]
		})
		return (rows as SearchHit[]).map((r: SearchHit) => ({ ...r, score: Number(r.score) }))
	}

	// Monolingual hybrid query: pg_trgm word-similarity on primary_text + tsvector ts_rank on the
	// body (flag 32 normalizes to (0,1) so it is comparable to word_similarity). Better lane wins.
	protected async searchBaseOnly(
		knex: any, term: string, channelIds: string[], cfg: string, bw: number, threshold: number, limit: number
	): Promise<SearchHit[]> {
		const sql = `
			WITH q AS (SELECT ?::text AS term, ?::text[] AS channel_ids, ?::regconfig AS cfg, ?::float AS bw)
			SELECT type, entity_id AS id, slug, group_slug, title, snippet,
			       greatest(
			         word_similarity(q.term, primary_text) * 1.0,
			         ts_rank(body_tsv, websearch_to_tsquery(q.cfg, q.term), 32) * q.bw
			       ) * weight AS score
			FROM search_document, q
			WHERE (q.term <% primary_text OR body_tsv @@ websearch_to_tsquery(q.cfg, q.term))
			  AND (sales_channel_ids IS NULL OR sales_channel_ids && q.channel_ids)
			ORDER BY score DESC, title ASC
			LIMIT ?
		`
		const rows = await knex.transaction(async (trx: any) => {
			await trx.raw(`SET LOCAL pg_trgm.word_similarity_threshold = ${threshold}`)
			const result = await trx.raw(sql, [term, channelIds, cfg, bw, limit])
			return result.rows as SearchHit[]
		})
		return (rows as SearchHit[]).map((r: SearchHit) => ({ ...r, score: Number(r.score) }))
	}

	async upsertDocument(input: SearchDocumentInput): Promise<void> {
		const existing = await this.listSearchDocuments({ type: input.type, entity_id: input.entity_id })
		if (existing.length > 0) {
			await this.updateSearchDocuments({ id: existing[0].id, ...input })
			await this.writeBaseTsv(existing[0].id, input.body_text, input.weight)
			return
		}
		try {
			const [created] = await this.createSearchDocuments([input])
			await this.writeBaseTsv(created.id, input.body_text, input.weight)
		} catch (error) {
			// Race: a concurrent upsert (e.g. a subscriber) created the row between our list and
			// create — the unique (type, entity_id) index rejects the duplicate, so update instead.
			const again = await this.listSearchDocuments({ type: input.type, entity_id: input.entity_id })
			if (again.length > 0) {
				await this.updateSearchDocuments({ id: again[0].id, ...input })
				await this.writeBaseTsv(again[0].id, input.body_text, input.weight)
			} else {
				throw error
			}
		}
	}

	async deleteDocumentByEntity(type: string, entityId: string): Promise<void> {
		const existing = await this.listSearchDocuments({ type, entity_id: entityId })
		if (existing.length > 0) {
			await this.deleteSearchDocuments(existing.map((d) => d.id))
		}
	}

	async baseIdForEntity(type: string, entity_id: string): Promise<string | undefined> {
		const [row] = await this.listSearchDocuments({ type, entity_id }, { take: 1 })
		return row?.id
	}

	// Upsert one locale row for a base document. The tsvector uses the locale's regconfig; like the
	// base table, it is written via raw SQL (no tsvector DML type) keyed by the row id.
	async upsertTranslation(input: SearchTranslationInput): Promise<void> {
		const existing = await this.listSearchDocumentTranslations({
			search_document_id: input.search_document_id,
			locale: input.locale
		})
		let id: string
		if (existing.length > 0) {
			await this.updateSearchDocumentTranslations({ id: existing[0].id, ...input })
			id = existing[0].id
		} else {
			const [created] = await this.createSearchDocumentTranslations([input])
			id = created.id
		}
		const cfg = configForLocale(input.locale, this.options_.localeTextSearchConfig)
		const knex = (this as any).__container__.manager.getKnex()
		await knex.raw(
			`UPDATE search_document_translation SET body_tsv = to_tsvector(?::regconfig, coalesce(?, '')) WHERE id = ?`,
			[cfg, input.body_text ?? '', id]
		)
	}

	// Drop locale rows that no longer have a real translation (handles un-translation).
	async pruneTranslations(searchDocumentId: string, keepLocales: string[]): Promise<void> {
		const rows = await this.listSearchDocumentTranslations({ search_document_id: searchDocumentId })
		const stale = rows.filter((r: any) => !keepLocales.includes(r.locale)).map((r: any) => r.id)
		if (stale.length > 0) await this.deleteSearchDocumentTranslations(stale)
	}
}

export default SearchModuleService
