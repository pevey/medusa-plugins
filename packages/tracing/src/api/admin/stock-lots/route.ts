import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminCreateStockLotType, AdminDeleteStockLotsType, AdminGetStockLotsType } from '../../validators'
import { createStockLotWorkflow } from '../../../workflows/tracing/create-stock-lot'
import { deleteStockLotWorkflow } from '../../../workflows/tracing/delete-stock-lot'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetStockLotsType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { inventory_item_id, location_id, enabled, q } = req.validatedQuery as {
		inventory_item_id?: string
		location_id?: string
		enabled?: boolean
		q?: string
	}

	const { data: stockLots, metadata } = await query.graph({
		entity: 'stock_lot',
		...req.queryConfig,
		filters: {
			...(inventory_item_id ? { inventory_item_id } : {}),
			...(location_id ? { location_id } : {}),
			...(enabled !== undefined ? { enabled } : {}),
			...(q ? { lot_number: { $ilike: `%${q}%` } } : {}) // search by lot_number
		}
	})

	res.json({
		stock_lots: stockLots,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateStockLotType>, res: MedusaResponse) => {
	const { result } = await createStockLotWorkflow(req.scope).run({
		input: req.validatedBody
	})
	// The workflow returns the raw ORM entity (created via a direct service call, not
	// query.graph), which also carries `initial_quantity`, `metadata`, and the standard
	// Medusa soft-delete `deleted_at` column -- none of which are part of the admin
	// contract (the GET routes never select them). Pick down to AdminStockLot's fields
	// so the create response matches the same shape as every other stock-lot route.
	const { id, inventory_item_id, stock_location_id, lot_number, description, enabled, stocked_quantity, created_at, updated_at } = result
	res.json({ stock_lot: { id, inventory_item_id, stock_location_id, lot_number, description, enabled, stocked_quantity, created_at, updated_at } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteStockLotsType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	await Promise.all(
		ids.map(id =>
			deleteStockLotWorkflow(req.scope).run({
				input: { id }
			})
		)
	)
	res.json({ deleted: ids })
}
