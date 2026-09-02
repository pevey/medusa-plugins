import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { SEARCH_MODULE } from '../modules/search'
import type SearchModuleService from '../modules/search/service'
import reindexSearchDocumentsWorkflow from '../workflows/reindex-search-documents'

export default async function searchSeedHandler({ container }: SubscriberArgs<Record<string, never>>) {
	const logger = container.resolve('logger')

	// Re-check emptiness here — with multiple worker instances, more than one loader
	// may have emitted the event. First one wins; the rest see rows and no-op.
	try {
		const search = container.resolve<SearchModuleService>(SEARCH_MODULE)
		const existing = await search.listSearchDocuments({}, { take: 1 })
		if (existing.length > 0) return
	} catch (error) {
		logger.error(`[search] initial seed check failed: ${(error as Error).message}`)
		return
	}

	logger.info('[search] no documents found, seeding search index in background...')
	const start = Date.now()
	try {
		const { result } = await reindexSearchDocumentsWorkflow(container).run({})
		logger.info(`[search] initial seed done in ${Date.now() - start}ms: ${JSON.stringify(result.counts)}`)
	} catch (error) {
		logger.error(`[search] initial seed failed: ${(error as Error).message}`)
	}
}

export const config: SubscriberConfig = {
	event: ['search.seed-empty-index']
}
