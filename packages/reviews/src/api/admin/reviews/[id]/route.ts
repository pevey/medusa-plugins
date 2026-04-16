import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { REVIEW_MODULE } from '../../../../modules/review'
import { ReviewService } from '../../../../modules/review/service'
import { AdminUpdateReviewType } from '../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const {
		data: [review]
	} = await query.graph(
		{
			entity: 'review',
			fields: req.queryConfig.fields,
			filters: { id: req.params.id }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ review })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateReviewType>,
	res: MedusaResponse
) => {
	const reviewService: ReviewService = req.scope.resolve(REVIEW_MODULE)
	let caching: ICachingModuleService | null = null
	try { caching = req.scope.resolve(Modules.CACHING) ?? null } catch { /* noop */ }
	const { id } = req.params
	const { status, ...rest } = req.validatedBody

	if (status === 'approved') {
		await reviewService.approveReview(id, req.auth_context.actor_id)
	} else if (status === 'rejected') {
		await reviewService.rejectReview(id, req.auth_context.actor_id)
	} else if (Object.keys(rest).length > 0 || status) {
		await reviewService.updateReviews({ id, ...(status ? { status } : {}), ...rest } as any)
	}

	const review = await reviewService.retrieveReview(id)

	// Invalidate store cache if this review has a product_id
	if (review.product_id && caching) {
		await caching.clear({ key: `store:reviews:${review.product_id}` })
	}

	res.json({ review })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const reviewService: ReviewService = req.scope.resolve(REVIEW_MODULE)
	await reviewService.deleteReviews([req.params.id])
	res.json({ deleted: [req.params.id] })
}
