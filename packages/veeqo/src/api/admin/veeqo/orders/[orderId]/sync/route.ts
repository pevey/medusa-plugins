import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncOrderToVeeqoWorkflow } from '../../../../../../workflows/veeqo/order'

// one-way sync of an order from medusa to veeqo
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { orderId } = req.params
	const { result } = await syncOrderToVeeqoWorkflow(req.scope).run({
		input: orderId
	})
	if (result) {
		res.json({ veeqo_order: result })
	} else {
		res.status(400).json({ error: 'Failed to sync order' })
	}
}
