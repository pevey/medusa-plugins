import {
	defineMiddlewares,
	validateAndTransformBody,
	MedusaRequest,
	MedusaResponse
} from '@medusajs/framework/http'
import type { NextFunction } from 'express'
import { AdminPostChat } from './validators'

function exposeMcpHeaders(
	req: MedusaRequest,
	res: MedusaResponse,
	next: NextFunction
) {
	res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')
	res.setHeader(
		'Access-Control-Allow-Headers',
		[res.getHeader('Access-Control-Allow-Headers') ?? '', 'mcp-session-id']
			.filter(Boolean)
			.join(', ')
	)
	next()
}

export default defineMiddlewares([
	{
		matcher: '/admin/mcp',
		method: ['GET', 'POST', 'DELETE'],
		middlewares: [exposeMcpHeaders]
	},
	{
		matcher: '/admin/chat',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminPostChat)]
	}
])
