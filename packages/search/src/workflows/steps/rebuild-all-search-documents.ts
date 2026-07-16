import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import type SearchModuleService from '../../modules/search/service'
import {
	resolveTranslationModule,
	isSourceTranslatable,
	fanOutTranslations
} from '../../modules/search/lib/translations'

const PAGE = 200

export const rebuildAllSearchDocumentsStep = createStep(
	'rebuild-all-search-documents',
	async (_, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const search = container.resolve('search') as SearchModuleService
		const mod = search.isTranslationsDisabled() ? null : resolveTranslationModule(container)
		const counts: Record<string, number> = {}

		for (const source of search.listSources()) {
			counts[source.type] = 0
			const reference = source.translationReference ?? source.entity
			const translatable = mod ? await isSourceTranslatable(mod, reference) : false
			for (let skip = 0; ; skip += PAGE) {
				const { data } = await query.graph({
					entity: source.entity,
					fields: source.fields,
					filters: source.reindexFilters ?? {},
					pagination: { take: PAGE, skip }
				})
				if (data.length === 0) break
				for (const row of data) {
					if (!source.visibility(row)) continue
					const doc = source.buildDocument(row)
					doc.weight = search.weightFor(source.type, doc.weight)
					await search.upsertDocument(doc)
					if (translatable) {
						const baseId = await search.baseIdForEntity(source.type, row.id)
						if (baseId) await fanOutTranslations(query, search, source, mod, reference, row.id, baseId)
					}
					counts[source.type]++
				}
				if (data.length < PAGE) break
			}
		}

		return new StepResponse(counts)
	}
)
