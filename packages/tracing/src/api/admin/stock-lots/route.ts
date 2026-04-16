import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import {
	AdminCreateStockLotType,
	AdminDeleteStockLotsType,
	AdminGetStockLotsType
} from '../../validators'
import { createStockLotWorkflow } from '../../../workflows/tracing/create-stock-lot'
import { deleteStockLotWorkflow } from '../../../workflows/tracing/delete-stock-lot'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetStockLotsType>,
	res: MedusaResponse
) => {
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

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateStockLotType>,
	res: MedusaResponse
) => {
	const { result } = await createStockLotWorkflow(req.scope).run({
		input: req.validatedBody
	})
	res.json({ stock_lot: result })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteStockLotsType>,
	res: MedusaResponse
) => {
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
