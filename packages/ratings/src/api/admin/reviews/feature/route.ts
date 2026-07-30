import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { REVIEW_MODULE } from '../../../../modules/review'
import { ReviewService } from '../../../../modules/review/service'
import { AdminFeatureReviewsType } from '../../../validators'
import { clearReviewCaches } from '../../../store/reviews/cache'

export const POST = async (req: AuthenticatedMedusaRequest<AdminFeatureReviewsType>, res: MedusaResponse) => {
	const reviewService: ReviewService = req.scope.resolve(REVIEW_MODULE)
	let caching: ICachingModuleService | null = null
	try {
		caching = req.scope.resolve(Modules.CACHING) ?? null
	} catch {
		/* noop */
	}
	const { ids, featured } = req.validatedBody

	// Tolerate unknown ids so a partial match doesn't fail the whole request
	const found = (await Promise.all(ids.map(id => reviewService.retrieveReview(id).catch(() => null)))).filter((r): r is NonNullable<typeof r> => r !== null)
	const foundIds = found.map(r => r.id)
	const productIds = [...new Set(found.map(r => r.product_id).filter(Boolean))]

	await Promise.all(foundIds.map(id => reviewService.setFeatured(id, req.auth_context.actor_id, featured)))

	await Promise.all(productIds.map(pid => clearReviewCaches(caching, pid as string)))

	res.json({ featured: foundIds })
}
