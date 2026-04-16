import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import {
	AdminCreateBarcode,
	AdminDeleteBarcodes,
	AdminGetBarcode,
	AdminGetBarcodes,
	AdminRenderBarcode,
	AdminUpdateBarcode
} from './validators'

export default defineMiddlewares([
	{
		matcher: '/admin/barcodes',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetBarcodes, {
				defaults: ['id', 'inventory_item_id', 'code', 'type', 'metadata', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/barcodes',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateBarcode)]
	},
	{
		matcher: '/admin/barcodes',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteBarcodes)]
	},
	{
		matcher: '/admin/barcodes/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetBarcode, {
				defaults: ['id', 'inventory_item_id', 'code', 'type', 'metadata', 'created_at', 'updated_at'],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/barcodes/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateBarcode)]
	},
	{
		matcher: '/admin/barcode-generator',
		method: ['GET'],
		middlewares: [validateAndTransformQuery(AdminRenderBarcode, {})]
	},
	{
		matcher: '/admin/barcode-generator',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminRenderBarcode)]
	}
])
