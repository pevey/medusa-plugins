import { z } from 'zod'
import {
	authenticate,
	defineMiddlewares,
	validateAndTransformBody,
	validateAndTransformQuery
} from '../../shims/framework-http.js'

export const GetThings = z.object({ q: z.string().optional() })
export const DeleteThings = z.object({ ids: z.array(z.string()).min(1) })
export const ApproveThings = z.object({ ids: z.array(z.string()).min(1) })

export default defineMiddlewares([
	{
		matcher: '/admin/things',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(GetThings, {
				defaults: ['id', 'name', 'created_at'],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/things',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(DeleteThings)]
	},
	{
		matcher: '/admin/things/:id',
		method: ['DELETE'],
		middlewares: []
	},
	{
		matcher: '/admin/things/approve',
		method: ['POST'],
		middlewares: [validateAndTransformBody(ApproveThings)]
	},
	{
		matcher: '/store/things/:id',
		method: ['GET'],
		middlewares: [authenticate('customer', 'bearer', { allowUnauthenticated: true })]
	},
	{
		matcher: '/admin/*',
		middlewares: []
	}
])
