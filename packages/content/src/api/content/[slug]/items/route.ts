import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { ContentStatus } from '../../../../modules/content/models/content-item'
import { StoreGetContentItemsType } from '../../../validators'

const TTL = 300 // 5 minutes

export const GET = async (
	req: MedusaRequest<StoreGetContentItemsType>,
	res: MedusaResponse
) => {
	let caching: ICachingModuleService | null = null
	try { caching = req.scope.resolve(Modules.CACHING) ?? null } catch { /* noop */ }
	const { slug } = req.params
	const { tag, q, limit, offset } = req.validatedQuery

	const cacheKey = `store:content-items:${slug}:${tag ?? ''}:${q ?? ''}:${limit}:${offset}`
	const cached = caching ? await caching.get({ key: cacheKey }) : null
	if (cached) {
		res.json(cached)
		return
	}

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: content_items, metadata } = await query.graph({
		entity: 'content_item',
		...req.queryConfig,
		filters: {
			status: ContentStatus.PUBLISHED,
			content_collection: { slug },
			...(tag ? { tags: { value: tag } } : {}),
			...(q ? { title: { $ilike: `%${q}%` } } : {})
		}
	})

	const body = {
		content_items,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	}

	if (caching) await caching.set({ key: cacheKey, data: body as unknown as object, ttl: TTL })
	res.json(body)
}
