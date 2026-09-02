import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import type SearchModuleService from '../../modules/search/service'

type Input = { type: string; id: string }

export const deleteSearchDocumentStep = createStep('delete-search-document', async ({ type, id }: Input, { container }) => {
	const search = container.resolve<SearchModuleService>('search')
	await search.deleteDocumentByEntity(type, id)
	return new StepResponse({ deleted: true })
})
