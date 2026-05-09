import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncOrderToVeeqoWorkflow } from '../../../../../../workflows/order'

// One-way sync of the ORDER_PLACED VeeqoOrder for this Medusa order from Medusa to Veeqo.
// For replacements (claim/exchange), use:
//   POST /admin/veeqo/orders/[orderId]/replacements/sync (bulk)
//   POST /admin/veeqo/sync (per-source)
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
