import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncWarehouseToVeeqoWorkflow } from '../../../../../workflows/veeqo/warehouse'
import { AdminSyncStockLocationsToVeeqoType } from '../../../../validators'

// one-way sync of stock locations from medusa to veeqo
export const POST = async (
	req: AuthenticatedMedusaRequest<AdminSyncStockLocationsToVeeqoType>,
	res: MedusaResponse
) => {
	const { stock_location_ids } = req.validatedBody
	const results = await Promise.all(
		stock_location_ids.map(stockLocationId =>
			syncWarehouseToVeeqoWorkflow(req.scope).run({
				input: stockLocationId
			})
		)
	)
	res.json({ synced_warehouse_ids: results.map(({ result }) => result?.id).filter(Boolean) })
}
