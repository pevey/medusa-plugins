import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import type SearchModuleService from '../../../modules/search/service'
import type { StoreSearchQuery } from '../../validators'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const { q, limit, locale } = req.validatedQuery as StoreSearchQuery
	const channelIds = (req as any).publishable_key_context?.sales_channel_ids ?? []
	const search = req.scope.resolve('search') as SearchModuleService

	const hits = await search.search(q, limit, channelIds, locale)
	return res.json({ hits })
}
