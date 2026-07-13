import type { LoaderOptions } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import reindexSearchDocumentsWorkflow from '../../../workflows/reindex-search-documents'
import type SearchModuleService from '../service'

export default async function seedIfEmptyLoader({ container }: LoaderOptions) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER) ?? console

	const workerMode = process.env.WORKER_MODE || 'shared'
	if (workerMode === 'server') return

	const search = container.resolve('search') as SearchModuleService

	let hasDocuments = false
	try {
		const existing = await search.listSearchDocuments({}, { take: 1 })
		hasDocuments = existing.length > 0
	} catch (error) {
		// Table may not exist yet (first boot before migrations); nothing to seed.
		logger.debug?.(`[search] seed check skipped: ${(error as Error).message}`)
		return
	}

	if (hasDocuments) return

	// Defer to next tick so the full app is bootstrapped before we hit workflows/query,
	// then fire-and-forget — a large catalog reindex can take minutes.
	setImmediate(() => {
		const start = Date.now()
		logger.info('[search] no documents found, seeding search index in background...')
		reindexSearchDocumentsWorkflow(container)
			.run({})
			.then(({ result }) => {
				logger.info(
					`[search] initial seed done in ${Date.now() - start}ms: ${JSON.stringify(result.counts)}`
				)
			})
			.catch((error: Error) => {
				logger.error(`[search] initial seed failed: ${error.message}`)
			})
	})
}
