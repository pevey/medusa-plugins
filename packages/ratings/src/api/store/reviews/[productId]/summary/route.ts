import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { ReviewStatus } from '../../../../../modules/review/models/review'
import { buildSummaryCacheKey } from '../../cache'

const TTL = 300

function resolveCaching(req: MedusaRequest): ICachingModuleService | null {
	try { return req.scope.resolve(Modules.CACHING) ?? null } catch { return null }
}

type Summary = { average: number; count: number; distribution: Record<1 | 2 | 3 | 4 | 5, number> }

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	const { productId } = req.params
	const caching = resolveCaching(req)
	const cacheKey = buildSummaryCacheKey(productId)

	const cached = caching ? (await caching.get({ key: cacheKey })) as Summary | null : null
	if (cached) { res.json(cached); return }

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	// No pagination key → query.graph returns ALL matching rows.
	const { data } = await query.graph({
		entity: 'review',
		fields: ['rating'],
		filters: { product_id: productId, status: ReviewStatus.APPROVED }
	})

	const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>
	let total = 0
	let count = 0
	for (const r of data) {
		const rt = r.rating as number
		if (rt >= 1 && rt <= 5) {
			distribution[rt as 1 | 2 | 3 | 4 | 5]++
			total += rt
			count++
		}
	}
	const average = count ? Math.round((total / count) * 10) / 10 : 0

	const summary: Summary = { average, count, distribution }
	if (caching) await caching.set({ key: cacheKey, data: summary as unknown as object, ttl: TTL })
	res.json(summary)
}
