import { validateAndTransformQuery, type MiddlewareRoute } from '@medusajs/framework/http'
import { z } from 'zod'

export const StoreSearchQuerySchema = z.object({
	q: z.string().optional().default(''),
	limit: z.preprocess((v) => {
		if (typeof v === 'string' && v.length > 0) return parseInt(v, 10)
		return v
	}, z.number().int().positive().max(25).optional().default(12))
})

export type StoreSearchQuery = z.infer<typeof StoreSearchQuerySchema>

export const searchRoutes: MiddlewareRoute[] = [
	{
		matcher: '/store/search',
		method: ['GET'],
		middlewares: [validateAndTransformQuery(StoreSearchQuerySchema, {})]
	}
]
