import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { ContentStatus } from '../../../../../modules/content/models/content-item'
import { StoreGetContentItemType } from '../../../../validators'

const TTL = 300 // 5 minutes

export const GET = async (
	req: MedusaRequest<StoreGetContentItemType>,
	res: MedusaResponse
) => {
	let caching: ICachingModuleService | null = null
	try { caching = req.scope.resolve(Modules.CACHING) ?? null } catch { /* noop */ }
	const { itemSlug } = req.params

	const cacheKey = `store:content-item:${itemSlug}`
	const cached = caching ? await caching.get({ key: cacheKey }) : null
	if (cached) {
		res.json(cached)
		return
	}

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: [content_item] } = await query.graph({
		entity: 'content_item',
		...req.queryConfig,
		filters: { slug: itemSlug, status: ContentStatus.PUBLISHED }
	})

	if (!content_item) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Content item "${itemSlug}" not found`)
	}

	const body = { content_item }
	if (caching) await caching.set({ key: cacheKey, data: body as unknown as object, ttl: TTL })
	res.json(body)
}
