import { validateAndTransformQuery, type MiddlewareRoute } from '@medusajs/framework/http'
import { StoreSearchQuerySchema } from '../validators'

export const searchRoutes: MiddlewareRoute[] = [
	{
		matcher: '/store/search',
		method: ['GET'],
		middlewares: [validateAndTransformQuery(StoreSearchQuerySchema, {})]
	},
	{
		matcher: '/admin/search/reindex',
		method: ['POST'],
		middlewares: []
	}
]
