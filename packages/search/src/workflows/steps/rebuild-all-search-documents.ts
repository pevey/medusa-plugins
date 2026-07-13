import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import type SearchModuleService from '../../modules/search/service'

const PAGE = 200

export const rebuildAllSearchDocumentsStep = createStep(
	'rebuild-all-search-documents',
	async (_, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const search = container.resolve('search') as SearchModuleService
		const counts: Record<string, number> = {}

		for (const source of search.listSources()) {
			counts[source.type] = 0
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
					counts[source.type]++
				}
				if (data.length < PAGE) break
			}
		}

		return new StepResponse(counts)
	}
)
