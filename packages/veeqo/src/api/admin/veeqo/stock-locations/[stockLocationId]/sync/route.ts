import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncWarehouseToVeeqoWorkflow } from '../../../../../../workflows/veeqo/warehouse'

// one-way sync of a stock location from medusa to veeqo
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { stockLocationId } = req.params
	const { result } = await syncWarehouseToVeeqoWorkflow(req.scope).run({
		input: stockLocationId
	})
	if (result) {
		res.json({ veeqo_warehouse: result })
	} else {
		res.status(400).json({ error: 'Failed to sync warehouse' })
	}
}
