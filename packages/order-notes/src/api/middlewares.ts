import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import { AdminCreateOrderNote, AdminGetOrderNotes } from './validators'

export default defineMiddlewares([
	{
		matcher: '/admin/order-notes',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetOrderNotes, {
				defaults: ['id', 'order_id', 'user_id', 'note', 'sent', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/order-notes',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateOrderNote)]
	}
])
