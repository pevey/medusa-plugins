import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import type SearchModuleService from '../../modules/search/service'

type Input = { type: string; id: string }

export const buildAndUpsertSearchDocumentStep = createStep(
	'build-and-upsert-search-document',
	async ({ type, id }: Input, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const search = container.resolve('search') as SearchModuleService

		const source = search.getSource(type)
		if (!source) {
			return new StepResponse({ indexed: false, skipped: true })
		}

		const { data } = await query.graph({ entity: source.entity, fields: source.fields, filters: { id } })
		const row = data[0]
		if (!row || !source.visibility(row)) {
			await search.deleteDocumentByEntity(type, id)
			return new StepResponse({ indexed: false })
		}

		const doc = source.buildDocument(row)
		doc.weight = search.weightFor(type, doc.weight)
		await search.upsertDocument(doc)
		return new StepResponse({ indexed: true })
	}
)
