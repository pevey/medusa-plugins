import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import upsertSearchDocumentWorkflow from '../workflows/upsert-search-document'
import deleteSearchDocumentWorkflow from '../workflows/delete-search-document'
import type SearchModuleService from '../modules/search/service'

export default async function searchCategoryHandler({ event: { name: eventName, data }, container }: SubscriberArgs<{ id: string }>) {
	const search = container.resolve('search') as SearchModuleService
	// Handler-gated: no-op unless the category source is enabled via plugin options
	if (!search.isSourceEnabled('category')) return

	const logger = container.resolve('logger')
	try {
		if (eventName === 'product-category.deleted') {
			await deleteSearchDocumentWorkflow(container).run({
				input: { type: 'category', id: data.id }
			})
		} else {
			await upsertSearchDocumentWorkflow(container).run({
				input: { type: 'category', id: data.id }
			})
		}
	} catch (error) {
		logger.error(`[search] ${eventName} failed for ${data.id}: ${(error as Error).message}`)
	}
}

export const config: SubscriberConfig = {
	event: ['product-category.created', 'product-category.updated', 'product-category.deleted']
}
