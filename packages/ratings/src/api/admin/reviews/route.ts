import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { REVIEW_MODULE } from '../../../modules/review'
import { ReviewService } from '../../../modules/review/service'
import { AdminDeleteReviewsType, AdminGetReviewsType } from '../../validators'

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
	await reviewService.deleteReviews(ids)
	res.json({ deleted: ids })
}
