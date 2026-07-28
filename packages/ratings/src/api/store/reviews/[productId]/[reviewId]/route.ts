import { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { REVIEW_MODULE } from '../../../../../modules/review'
import { ReviewService } from '../../../../../modules/review/service'
import { StoreUpdateReviewType } from '../../../../validators'
import { clearReviewCaches } from '../../cache'

function resolveCaching(req: MedusaRequest): ICachingModuleService | null {
	try {
		return req.scope.resolve(Modules.CACHING) ?? null
	} catch {
		return null
	}
}

export const POST = async (
	req: AuthenticatedMedusaRequest<StoreUpdateReviewType>,
	res: MedusaResponse
) => {
	const { reviewId } = req.params
	const customerId = req.auth_context.actor_id
	const caching = resolveCaching(req)
	const reviewService: ReviewService = req.scope.resolve(REVIEW_MODULE)

	const currentReview = await reviewService.retrieveReview(reviewId)
	if (currentReview.customer_id === customerId) {
		const review = await reviewService.updateReviews({
			...req.validatedBody,
			id: reviewId,
			customer_id: customerId,
			status: reviewService.getOptions().defaultStatus
		})
		await clearReviewCaches(caching, currentReview.product_id)
		res.json({ review })
	} else {
		res.status(403).json({})
	}
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { reviewId } = req.params
	const customerId = req.auth_context.actor_id
	const reviewService: ReviewService = req.scope.resolve(REVIEW_MODULE)
	const caching = resolveCaching(req)
	const review = await reviewService.retrieveReview(reviewId)
	if (review.customer_id === customerId) {
		await reviewService.deleteReviews(reviewId)
		await clearReviewCaches(caching, review.product_id)
		res.json({ deleted: reviewId })
	} else {
		res.status(403).json({})
	}
}
