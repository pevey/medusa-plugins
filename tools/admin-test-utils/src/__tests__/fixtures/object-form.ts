import { z } from 'zod'
import { defineMiddlewares, validateAndTransformBody } from '../../shims/framework-http.js'

export const CreateWidget = z.object({ name: z.string() })

export default defineMiddlewares({
	routes: [
		{
			matcher: '/admin/widgets',
			method: ['POST'],
			middlewares: [validateAndTransformBody(CreateWidget)]
		}
	]
})
