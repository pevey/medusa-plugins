import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import { resolveTranslationModule } from '../modules/search/lib/translations'
import upsertSearchDocumentWorkflow from '../workflows/upsert-search-document'
import type SearchModuleService from '../modules/search/service'

// Translation `reference` (table name) -> search source `type`. Extend as sources gain
// translation support; an unmapped reference falls through to a same-named source type.
const REFERENCE_TO_TYPE: Record<string, string> = {
	product: 'product',
	product_category: 'category',
	product_collection: 'collection'
}

export default async function searchTranslationHandler({
	event: { name: eventName, data },
	container
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger')
	try {
		const mod = resolveTranslationModule(container)
		if (!mod?.retrieveTranslation) return
		const t = await mod.retrieveTranslation(data.id).catch(() => null)
		if (!t) return
		const search = container.resolve('search') as SearchModuleService
		const type = REFERENCE_TO_TYPE[t.reference] ?? t.reference
		if (!search.isSourceEnabled(type)) return
		await upsertSearchDocumentWorkflow(container).run({ input: { type, id: t.reference_id } })
	} catch (error) {
		logger.error(`[search] ${eventName} failed for ${data.id}: ${(error as Error).message}`)
	}
}

export const config: SubscriberConfig = {
	event: ['translation.created', 'translation.updated', 'translation.deleted']
}
