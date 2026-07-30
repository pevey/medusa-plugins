import { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { REVIEW_MODULE } from '../../../../modules/review'
import { ReviewService } from '../../../../modules/review/service'
import { ReviewStatus } from '../../../../modules/review/models/review'
import { StoreCreateReviewType, StoreGetReviewsType } from '../../../validators'
import { buildListCacheKey, clearReviewCaches } from '../cache'

const TTL = 300 // 5 minutes

function resolveCaching(req: MedusaRequest): ICachingModuleService | null {
	try {
		return req.scope.resolve(Modules.CACHING) ?? null
	} catch {
		return null
	}
}

export const GET = async (req: MedusaRequest<StoreGetReviewsType>, res: MedusaResponse) => {
	const { productId } = req.params
	const caching = resolveCaching(req)
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const customerId = (req as AuthenticatedMedusaRequest).auth_context?.actor_id
	const {
		featured,
		rating,
		limit = 20,
		offset = 0,
		order
	} = req.validatedQuery as StoreGetReviewsType & {
		limit?: number
		offset?: number
		order?: string
	}

	const cacheKey = buildListCacheKey(productId)
	let approvedReviews: any[]

	const cached = caching ? ((await caching.get({ key: cacheKey })) as { reviews: any[] } | null) : null
	if (cached) {
		approvedReviews = cached.reviews
	} else {
		const { data } = await query.graph({
			entity: 'review',
			fields: req.queryConfig.fields,
			filters: { product_id: productId, status: ReviewStatus.APPROVED }
		})
		approvedReviews = data
		if (caching) {
			await caching.set({
				key: cacheKey,
				data: { reviews: approvedReviews } as unknown as object,
				ttl: TTL
			})
		}
	}

	// Prepend the signed-in customer's own still-pending reviews (always fresh).
	let combined = approvedReviews
	if (customerId) {
		const { data: pendingReviews } = await query.graph({
			entity: 'review',
			fields: req.queryConfig.fields,
			filters: { product_id: productId, customer_id: customerId, status: ReviewStatus.PENDING }
		})
		if (pendingReviews.length > 0) combined = [...pendingReviews, ...approvedReviews]
	}

	// Filter → sort → paginate, in memory.
	let rows = combined
	if (rating !== undefined) rows = rows.filter(r => r.rating === rating)
	if (featured) rows = rows.filter(r => r.featured === true)

	const [field, dir] = order?.startsWith('-') ? [order.slice(1), -1] : [order ?? 'created_at', 1]
	rows = [...rows].sort((a, b) => {
		const av = a[field],
			bv = b[field]
		if (av === bv) return 0
		return (av > bv ? 1 : -1) * (dir as number)
	})

	const count = rows.length
	const page = rows.slice(offset, offset + limit)
	res.json({ reviews: page, count, limit, offset })
}

export const POST = async (req: AuthenticatedMedusaRequest<StoreCreateReviewType>, res: MedusaResponse) => {
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

	await clearReviewCaches(caching, productId)

	res.status(201).json({ review })
}
