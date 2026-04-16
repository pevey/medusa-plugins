import { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { REVIEW_MODULE } from '../../../../modules/review'
import { ReviewService } from '../../../../modules/review/service'
import { ReviewStatus } from '../../../../modules/review/models/review'
import { StoreCreateReviewType, StoreGetReviewsType } from '../../../validators'

const TTL = 300 // 5 minutes
const buildCacheKey = (productId: string) => `store:reviews:${productId}`

function resolveCaching(req: MedusaRequest): ICachingModuleService | null {
	try {
		return req.scope.resolve(Modules.CACHING) ?? null
	} catch {
		return null
	}
}

export const GET = async (
	req: MedusaRequest<StoreGetReviewsType>,
	res: MedusaResponse
) => {
	const { productId } = req.params
	const caching = resolveCaching(req)
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const customerId = (req as AuthenticatedMedusaRequest).auth_context?.actor_id

	const cacheKey = buildCacheKey(productId)
	let approvedReviews: any[]
	let approvedCount: number

	const cached = caching ? await caching.get({ key: cacheKey }) as { reviews: any[]; count: number } | null : null
	if (cached) {
		approvedReviews = cached.reviews
		approvedCount = cached.count
	} else {
		const { data, metadata } = await query.graph({
			entity: 'review',
			fields: req.queryConfig.fields,
			filters: { product_id: productId, status: ReviewStatus.APPROVED }
		})
		approvedReviews = data
		approvedCount = metadata?.count ?? data.length
		if (caching) {
			await caching.set({
				key: cacheKey,
				data: { reviews: approvedReviews, count: approvedCount } as unknown as object,
				ttl: TTL
			})
		}
	}

	// If authenticated, also fetch the user's own pending reviews (always fresh)
	if (customerId) {
		const { data: pendingReviews } = await query.graph({
			entity: 'review',
			fields: req.queryConfig.fields,
			filters: {
				product_id: productId,
				customer_id: customerId,
				status: ReviewStatus.PENDING
			}
		})

		if (pendingReviews.length > 0) {
			res.json({
				reviews: [...pendingReviews, ...approvedReviews],
				count: approvedCount + pendingReviews.length
			})
			return
		}
	}

	res.json({ reviews: approvedReviews, count: approvedCount })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<StoreCreateReviewType>,
	res: MedusaResponse
) => {
	const { productId } = req.params
	const customerId = req.auth_context.actor_id
	const caching = resolveCaching(req)
	const reviewService: ReviewService = req.scope.resolve(REVIEW_MODULE)

	const review = await reviewService.createReviews({
		...req.validatedBody,
		product_id: productId,
		customer_id: customerId,
		status: reviewService.getOptions().defaultStatus
	})

	if (caching) {
		await caching.clear({ key: buildCacheKey(productId) })
	}

	res.status(201).json({ review })
}
