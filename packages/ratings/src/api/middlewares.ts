import {
	authenticate,
	defineMiddlewares,
	validateAndTransformBody,
	validateAndTransformQuery
} from '@medusajs/framework/http'
import {
	AdminApproveReviewAction,
	AdminRejectReviewAction,
	AdminFeatureReviewAction,
	AdminDeleteReviews,
	AdminGetReview,
	AdminGetReviews,
	AdminUpdateReview,
	StoreCreateReview,
	StoreGetReviews,
	StoreUpdateReview
} from './validators'

export default defineMiddlewares([
	{
		matcher: '/admin/products/:id',
		method: ['GET'], // A middleware entry without method is registered by Medusa as app.use(matcher)
		middlewares: [
			// @ts-ignore
			(req, res, next) => {
				;(req.allowed ??= []).push('review')
				next()
			}
		]
	},
	{
		matcher: '/admin/reviews',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetReviews, {
				defaults: [
					'id',
					'status',
					'rating',
					'title',
					'body',
					'author_name',
					'author_email',
					'product_id',
					'order_id',
					'customer_id',
					'featured',
					'created_at',
					'updated_at',
					'product.*'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/reviews',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteReviews)]
	},
	{
		matcher: '/admin/reviews/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetReview, {
				defaults: [
					'id',
					'status',
					'rating',
					'title',
					'body',
					'author_name',
					'author_email',
					'product_id',
					'order_id',
					'customer_id',
					'featured',
					'metadata',
					'created_at',
					'updated_at',
					'activity.*',
					'product.*'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/reviews/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateReview)]
	},
	{
		matcher: '/admin/reviews/:id',
		method: ['DELETE'],
		middlewares: []
	},
	{
		matcher: '/admin/reviews/approve',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminApproveReviewAction)]
	},
	{
		matcher: '/admin/reviews/reject',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminRejectReviewAction)]
	},
	{
		matcher: '/admin/reviews/feature',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminFeatureReviewAction)]
	},
	// ── Store ────────────────────────────────────────────────────────────────
	{
		matcher: '/store/products',
		method: ['GET'],
		middlewares: [
			// @ts-ignore
			(req, res, next) => {
				;(req.allowed ??= []).push('review')
				next()
			}
		]
	},
	{
		matcher: '/store/products/:id',
		method: ['GET'],
		middlewares: [
			// @ts-ignore
			(req, res, next) => {
				;(req.allowed ??= []).push('review')
				next()
			}
		]
	},
	{
		matcher: '/store/reviews/:productId',
		method: ['POST'],
		middlewares: [authenticate('customer', 'bearer'), validateAndTransformBody(StoreCreateReview)]
	},
	{
		matcher: '/store/reviews/:productId',
		method: ['GET'],
		middlewares: [
			authenticate('customer', 'bearer', { allowUnauthenticated: true }),
			validateAndTransformQuery(StoreGetReviews, {
				defaults: [
					'id',
					'status',
					'rating',
					'title',
					'body',
					'author_name',
					'product_id',
					'customer_id',
					'featured',
					'created_at'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/store/reviews/:productId/:reviewId',
		method: ['DELETE'],
		middlewares: [authenticate('customer', 'bearer')]
	},
	{
		matcher: '/store/reviews/:productId/:reviewId',
		method: ['POST'],
		middlewares: [authenticate('customer', 'bearer'), validateAndTransformBody(StoreUpdateReview)]
	}
])
