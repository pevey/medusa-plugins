import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import type SearchModuleService from '../../../modules/search/service'
import type { StoreSearchQuery } from '../../validators'
import { resolveTranslationModule } from '../../../modules/search/lib/translations'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
	const { q, limit, locale } = req.validatedQuery as StoreSearchQuery
	const channelIds = (req as any).publishable_key_context?.sales_channel_ids ?? []
	const search = req.scope.resolve<SearchModuleService>('search')

	// The Translation module is only resolvable from the app/request container, not the search
	// module's own container, so the localized-vs-base decision has to be made here. Non-translated
	// stores never pay the UNION overhead; the base document is always returned when inactive.
	const translationsActive = !search.isTranslationsDisabled() && (search.translationsForced() || !!resolveTranslationModule(req.scope))

	const hits = await search.search(q, limit, channelIds, translationsActive ? locale : undefined)
	return res.json({ hits })
}
