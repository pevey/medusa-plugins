import { MedusaService, Modules } from '@medusajs/framework/utils'
import SearchDocument from './models/search-document'
import { buildRegistry } from './lib/sources'
import type { SearchDocumentInput, SearchHit, SearchSource, PluginOptions } from './lib/types'

class SearchModuleService extends MedusaService({
	SearchDocument
}) {
	protected options_: PluginOptions
	protected registry_: Map<string, SearchSource>
	protected container_: any

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

	getSource(type: string): SearchSource | undefined {
		return this.registry_.get(type)
	}

	isSourceEnabled(type: string): boolean {
		return this.registry_.has(type)
	}

	listSources(): SearchSource[] {
		return [...this.registry_.values()]
	}

	weightFor(type: string, fallback = 1): number {
		return this.options_.weights?.[type] ?? fallback
	}

	async search(term: string, limit?: number, channelIds: string[] = []): Promise<SearchHit[]> {
		const clean = term.trim()
		if (clean.length < 2) return []
		const effectiveLimit = limit ?? this.options_.limit ?? 12
		// SET does not accept bound params; threshold is a trusted number from options, so inline it safely.
		const rawThreshold = this.options_.wordSimilarityThreshold ?? 0.3
		const threshold = Number.isFinite(rawThreshold) ? Number(rawThreshold) : 0.3

		const manager = (this as any).__container__?.manager
		if (!manager) throw new Error('Database manager not available')
		const knex = manager.getKnex()

		const sql = `
			WITH q AS (SELECT ?::text AS term, ?::text[] AS channel_ids)
			SELECT type, entity_id AS id, slug, group_slug, title, snippet,
			       greatest(
			         word_similarity(q.term, primary_text) * 1.0,
			         word_similarity(q.term, coalesce(secondary_text, '')) * 0.3
			       ) * weight AS score
			FROM search_document, q
			WHERE (q.term <% primary_text OR q.term <% coalesce(secondary_text, ''))
			  AND (sales_channel_ids IS NULL OR sales_channel_ids && q.channel_ids)
			ORDER BY score DESC, title ASC
			LIMIT ?
		`

		const rows = await knex.transaction(async (trx: any) => {
			await trx.raw(`SET LOCAL pg_trgm.word_similarity_threshold = ${threshold}`)
			const result = await trx.raw(sql, [clean, channelIds, effectiveLimit])
			return result.rows as SearchHit[]
		})

		return (rows as SearchHit[]).map((r: SearchHit) => ({ ...r, score: Number(r.score) }))
	}

	async upsertDocument(input: SearchDocumentInput): Promise<void> {
		const existing = await this.listSearchDocuments({ type: input.type, entity_id: input.entity_id })
		if (existing.length > 0) {
			await this.updateSearchDocuments({ id: existing[0].id, ...input })
			return
		}
		try {
			await this.createSearchDocuments([input])
		} catch (error) {
			// Race: a concurrent upsert (e.g. a subscriber) created the row between our list and
			// create — the unique (type, entity_id) index rejects the duplicate, so update instead.
			const again = await this.listSearchDocuments({ type: input.type, entity_id: input.entity_id })
			if (again.length > 0) {
				await this.updateSearchDocuments({ id: again[0].id, ...input })
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
}

export default SearchModuleService
