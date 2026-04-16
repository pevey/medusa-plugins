import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { StoreGetContentCollectionType } from '../../validators'

const TTL = 300 // 5 minutes

export const GET = async (
	req: MedusaRequest<StoreGetContentCollectionType>,
	res: MedusaResponse
) => {
	let caching: ICachingModuleService | null = null
	try { caching = req.scope.resolve(Modules.CACHING) ?? null } catch { /* noop */ }
	const { slug } = req.params

	const cacheKey = `store:content-collection:${slug}`
	const cached = caching ? await caching.get({ key: cacheKey }) : null
	if (cached) {
		res.json(cached)
		return
	}

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: [content_collection] } = await query.graph({
		entity: 'content_collection',
		...req.queryConfig,
		filters: { slug }
	})

	if (!content_collection) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Content collection "${slug}" not found`)
	}

	const body = { content_collection }
	if (caching) await caching.set({ key: cacheKey, data: body as unknown as object, ttl: TTL })
	res.json(body)
}
