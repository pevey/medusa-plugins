import { authenticate, defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import {
	AdminApproveReviewAction,
	AdminRejectReviewAction,
	AdminDeleteReviews,
	AdminGetReview,
	AdminGetReviews,
	AdminUpdateReview,
	StoreCreateReview,
	StoreGetReviews
} from './validators'

export default defineMiddlewares([
	{
		matcher: '/admin/reviews',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetReviews, {
				defaults: [
					'id', 'status', 'rating', 'title', 'author_name', 'author_email',
					'product_id', 'order_id', 'customer_id', 'created_at', 'updated_at'
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
					'id', 'status', 'rating', 'title', 'body', 'author_name', 'author_email',
					'product_id', 'order_id', 'customer_id', 'metadata',
					'created_at', 'updated_at', 'activity.*'
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
	// ── Store ────────────────────────────────────────────────────────────────
	{
		matcher: '/store/reviews/:productId',
		method: ['POST'],
		middlewares: [
			authenticate('customer', 'bearer'),
			validateAndTransformBody(StoreCreateReview)
		]
	},
	{
		matcher: '/store/reviews/:productId',
		method: ['GET'],
		middlewares: [
			authenticate('customer', 'bearer', { allowUnauthenticated: true }),
			validateAndTransformQuery(StoreGetReviews, {
				defaults: [
					'id', 'status', 'rating', 'title', 'body', 'author_name',
					'product_id', 'customer_id', 'created_at'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	}
])
