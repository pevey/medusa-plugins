import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import upsertSearchDocumentWorkflow from '../workflows/upsert-search-document'
import deleteSearchDocumentWorkflow from '../workflows/delete-search-document'
import type SearchModuleService from '../modules/search/service'

export default async function searchCollectionHandler({
	event: { name: eventName, data },
	container
}: SubscriberArgs<{ id: string }>) {
	const search = container.resolve('search') as SearchModuleService
	// Handler-gated: no-op unless the collection source is enabled via plugin options
	if (!search.isSourceEnabled('collection')) return

	const logger = container.resolve('logger')
	try {
		if (eventName === 'product-collection.deleted') {
			await deleteSearchDocumentWorkflow(container).run({ input: { type: 'collection', id: data.id } })
		} else {
			await upsertSearchDocumentWorkflow(container).run({ input: { type: 'collection', id: data.id } })
		}
	} catch (error) {
		logger.error(`[search] ${eventName} failed for ${data.id}: ${(error as Error).message}`)
	}
}

export const config: SubscriberConfig = {
	event: ['product-collection.created', 'product-collection.updated', 'product-collection.deleted']
}
