import { z } from '@medusajs/framework/zod'
import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import type { MiddlewareRoute } from './_types'
import {
	AdminAddCustomerTag,
	AdminCreateCustomerTag,
	AdminDeleteCustomerTags,
	AdminGetCustomerTag,
	AdminGetCustomerTags,
	AdminUpdateCustomerTag
} from '../validators'

export const customerTagRoutes: MiddlewareRoute[] = [
	{
		matcher: '/admin/customer-tags',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetCustomerTags, {
				defaults: ['id', 'value', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/customer-tags',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateCustomerTag)]
	},
	{
		matcher: '/admin/customer-tags',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteCustomerTags)]
	},
	{
		matcher: '/admin/customer-tags/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetCustomerTag, {
				defaults: ['id', 'value', 'created_at', 'updated_at'],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/customer-tags/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateCustomerTag)]
	},
	{
		matcher: '/admin/customers',
		middlewares: [
			(req, _res, next) => {
				;(req.allowed ??= []).push('complaints', 'customer_tags')
				next()
			}
		]
	},
	{
		matcher: '/admin/customers/:id',
		method: ['POST'],
		additionalDataValidator: {
			tag_ids: z.array(z.string()).optional()
		}
	},
	{
		matcher: '/admin/customers/:id/customer-tags',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminAddCustomerTag)]
	}
]
