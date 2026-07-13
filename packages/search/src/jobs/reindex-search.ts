import { MedusaContainer } from '@medusajs/framework/types'
import reindexSearchDocumentsWorkflow from '../workflows/reindex-search-documents'

export default async function reindexSearchJob(container: MedusaContainer) {
	const logger = container.resolve('logger')
	const start = Date.now()
	logger.info('[search] nightly reindex started')
	try {
		const { result } = await reindexSearchDocumentsWorkflow(container).run({})
		logger.info(`[search] nightly reindex done in ${Date.now() - start}ms: ${JSON.stringify(result.counts)}`)
	} catch (error) {
		logger.error(`[search] nightly reindex failed: ${(error as Error).message}`)
	}
}

export const config = {
	name: 'reindex-search-documents',
	schedule: '0 3 * * *'
}
