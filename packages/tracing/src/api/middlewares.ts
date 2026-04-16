import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'
import {
	AdminCreateInvalidationReason,
	AdminCreateSerialNumber,
	AdminCreateStockLot,
	AdminDeleteInvalidationReasons,
	AdminDeleteSerialNumbers,
	AdminDeleteStockLots,
	AdminGetInvalidationReason,
	AdminGetInvalidationReasons,
	AdminGetSerialNumber,
	AdminGetSerialNumbers,
	AdminGetStockLot,
	AdminGetStockLots,
	AdminUpdateInvalidationReason,
	AdminUpdateSerialNumber,
	AdminUpdateStockLot
} from './validators'

export default defineMiddlewares([
	{
		matcher: '/admin/stock-lots',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetStockLots, {
				defaults: [
					'id', 'inventory_item_id', 'stock_location_id', 'lot_number',
					'description', 'enabled', 'stocked_quantity', 'created_at', 'updated_at'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/stock-lots',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateStockLot)]
	},
	{
		matcher: '/admin/stock-lots',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteStockLots)]
	},
	{
		matcher: '/admin/stock-lots/enable',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminDeleteStockLots)]
	},
	{
		matcher: '/admin/stock-lots/disable',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminDeleteStockLots)]
	},
	{
		matcher: '/admin/stock-lots/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetStockLot, {
				defaults: [
					'id', 'inventory_item_id', 'stock_location_id', 'lot_number',
					'description', 'enabled', 'stocked_quantity', 'created_at', 'updated_at',
					'inventory_item.*', 'stock_location.*'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/stock-lots/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateStockLot)]
	},
	{
		matcher: '/admin/stock-lots/:id/serial-numbers',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(createFindParams(), {
				defaults: ['id', 'value', 'order_id', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 10
			})
		]
	},
	{
		matcher: '/admin/serial-numbers',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetSerialNumbers, {
				defaults: [
					'id', 'stock_lot_id', 'order_id', 'value', 'invalidated', 'created_at', 'updated_at'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/serial-numbers',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateSerialNumber)]
	},
	{
		matcher: '/admin/serial-numbers',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteSerialNumbers)]
	},
	{
		matcher: '/admin/serial-numbers/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetSerialNumber, {
				defaults: [
					'id', 'stock_lot_id', 'order_id', 'value', 'invalidated',
					'created_at', 'updated_at', 'stock_lot.*', 'order.*'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/serial-numbers/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateSerialNumber)]
	},
	{
		matcher: '/admin/invalidation-reasons',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetInvalidationReasons, {
				defaults: ['id', 'value', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/invalidation-reasons',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateInvalidationReason)]
	},
	{
		matcher: '/admin/invalidation-reasons',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteInvalidationReasons)]
	},
	{
		matcher: '/admin/invalidation-reasons/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetInvalidationReason, {
				defaults: ['id', 'value', 'created_at', 'updated_at'],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/invalidation-reasons/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateInvalidationReason)]
	}
])
