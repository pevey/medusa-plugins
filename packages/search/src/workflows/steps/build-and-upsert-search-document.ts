import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import type SearchModuleService from '../../modules/search/service'
import { resolveTranslationModule, isSourceTranslatable, fanOutTranslations } from '../../modules/search/lib/translations'

type Input = { type: string; id: string }

export const buildAndUpsertSearchDocumentStep = createStep('build-and-upsert-search-document', async ({ type, id }: Input, { container }) => {
	const query = container.resolve(ContainerRegistrationKeys.QUERY)
	const search = container.resolve<SearchModuleService>('search')

	const source = search.getSource(type)
	if (!source) {
		return new StepResponse({ indexed: false, skipped: true })
	}

	const { data } = await query.graph({
		entity: source.entity,
		fields: source.fields,
		filters: { id }
	})
	const row = data[0]
	if (!row || !source.visibility(row)) {
		await search.deleteDocumentByEntity(type, id)
		return new StepResponse({ indexed: false })
	}

	const doc = source.buildDocument(row)
	doc.weight = search.weightFor(type, doc.weight)
	await search.upsertDocument(doc)

	// Targeted fan-out: when the Translation module is active for this source, emit one locale
	// row per locale that actually has a translation (skipping fallback duplicates), then prune.
	const mod = search.isTranslationsDisabled() ? null : resolveTranslationModule(container)
	const reference = source.translationReference ?? source.entity
	if (mod && (await isSourceTranslatable(mod, reference))) {
		const baseId = await search.baseIdForEntity(type, id)
		if (baseId) await fanOutTranslations(query, search, source, mod, reference, id, baseId)
	}

	return new StepResponse({ indexed: true })
})
