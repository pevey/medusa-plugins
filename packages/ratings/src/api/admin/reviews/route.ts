import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { REVIEW_MODULE } from '../../../modules/review'
import { ReviewService } from '../../../modules/review/service'
import { AdminDeleteReviewsType, AdminGetReviewsType } from '../../validators'
import { clearReviewCaches } from '../../store/reviews/cache'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetReviewsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { status, product_id, customer_id, q } = req.validatedQuery

	const { data: reviews, metadata } = await query.graph({
		entity: 'review',
		...req.queryConfig,
		filters: {
			...(status ? { status } : {}),
			...(product_id ? { product_id } : {}),
			...(customer_id ? { customer_id } : {}),
			...(q ? { author_name: { $ilike: `%${q}%` } } : {})
		}
	})

	res.json({
		reviews,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteReviewsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const reviewService: ReviewService = req.scope.resolve(REVIEW_MODULE)
	let caching: ICachingModuleService | null = null
	try { caching = req.scope.resolve(Modules.CACHING) ?? null } catch { /* noop */ }

	// Collect product_ids before deletion so we know which caches to clear,
	// tolerating unknown ids so a partial match doesn't fail the whole request
	const found = (await Promise.all(
		ids.map(id => reviewService.retrieveReview(id).catch(() => null))
	)).filter((r): r is NonNullable<typeof r> => r !== null)
	const foundIds = found.map(r => r.id)
	const productIds = [...new Set(found.map(r => r.product_id).filter(Boolean))]

	if (foundIds.length) await reviewService.deleteReviews(foundIds)

	await Promise.all(productIds.map(pid => clearReviewCaches(caching, pid as string)))

	res.json({ deleted: foundIds })
}
