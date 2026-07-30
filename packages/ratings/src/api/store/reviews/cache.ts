import type { ICachingModuleService } from '@medusajs/types'

export const buildListCacheKey = (productId: string) => `store:reviews:${productId}`
export const buildSummaryCacheKey = (productId: string) => `store:reviews:summary:${productId}`

export async function clearReviewCaches(caching: ICachingModuleService | null, productId: string | null | undefined) {
	if (!caching || !productId) return
	await Promise.all([caching.clear({ key: buildListCacheKey(productId) }), caching.clear({ key: buildSummaryCacheKey(productId) })])
}
