import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncDeliveryMethodToVeeqoWorkflow } from '../../../../../../workflows/veeqo/delivery-method'

// one-way sync of a delivery method from medusa to veeqo
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { shippingOptionId } = req.params
	const result = await syncDeliveryMethodToVeeqoWorkflow(req.scope).run({
		input: shippingOptionId
	})
	if (result) {
		res.json({ veeqo_delivery_method: result })
	} else {
		res.status(400).json({ error: 'Failed to sync delivery method' })
	}
}
