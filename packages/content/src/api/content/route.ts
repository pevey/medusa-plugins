import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { StoreGetContentCollectionsType } from '../validators'

const TTL = 300 // 5 minutes

export const GET = async (
	req: MedusaRequest<StoreGetContentCollectionsType>,
	res: MedusaResponse
) => {
	let caching: ICachingModuleService | null = null
	try { caching = req.scope.resolve(Modules.CACHING) ?? null } catch { /* noop */ }
	const { q } = req.validatedQuery

	const cacheKey = `store:content-collections:${q ?? 'all'}`
	const cached = caching ? await caching.get({ key: cacheKey }) : null
	if (cached) {
		res.json(cached)
		return
	}

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: content_collections, metadata } = await query.graph({
		entity: 'content_collection',
		...req.queryConfig,
		filters: {
			...(q ? { label: { $ilike: `%${q}%` } } : {})
		}
	})

	const body = {
		content_collections,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	}

	if (caching) await caching.set({ key: cacheKey, data: body as unknown as object, ttl: TTL })
	res.json(body)
}
