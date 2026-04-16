import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { REVIEW_MODULE } from '../../../../modules/review'
import { ReviewService } from '../../../../modules/review/service'
import { AdminRejectReviewActionType } from '../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminRejectReviewActionType>,
	res: MedusaResponse
) => {
	const reviewService: ReviewService = req.scope.resolve(REVIEW_MODULE)
	let caching: ICachingModuleService | null = null
	try { caching = req.scope.resolve(Modules.CACHING) ?? null } catch { /* noop */ }
	const { ids } = req.validatedBody

	// Collect product_ids before rejecting so we know which caches to clear
	const reviews = await Promise.all(ids.map(id => reviewService.retrieveReview(id)))
	const productIds = [...new Set(reviews.map(r => r.product_id).filter(Boolean))]

	await Promise.all(ids.map(id => reviewService.rejectReview(id, req.auth_context.actor_id)))

	// Invalidate store cache for affected products
	if (caching) {
		await Promise.all(productIds.map(pid => caching!.clear({ key: `store:reviews:${pid}` })))
	}

	res.json({ rejected: ids })
}
