import type { SubscriberArgs } from '@medusajs/framework'
import upsertSearchDocumentWorkflow from './workflows/upsert-search-document'
import deleteSearchDocumentWorkflow from './workflows/delete-search-document'

/**
 * Build a subscriber handler for a host-declared custom source. Handles the common case
 * where `event.data.id` IS the source entity's id (`*.deleted` → delete, else → upsert).
 * For fan-out events (where the id is a parent whose children must be reindexed), wrap
 * this in a host subscriber that resolves the affected ids and calls the exported
 * upsert/delete workflows directly.
 */
export function searchSourceSubscriber(type: string) {
	return async function ({ event: { name: eventName, data }, container }: SubscriberArgs<{ id: string }>) {
		const logger = container.resolve('logger')
		try {
			if (eventName.endsWith('.deleted')) {
				await deleteSearchDocumentWorkflow(container).run({ input: { type, id: data.id } })
			} else {
				await upsertSearchDocumentWorkflow(container).run({ input: { type, id: data.id } })
			}
		} catch (error) {
			logger.error(`[search] ${eventName} failed for ${type}:${data.id}: ${(error as Error).message}`)
		}
	}
}
