import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncCustomerToVeeqoWorkflow } from '../../../../../../workflows/veeqo/customer'

// one-way sync of a customer from medusa to veeqo
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { customerId } = req.params
	const { result } = await syncCustomerToVeeqoWorkflow(req.scope).run({
		input: customerId
	})
	if (result) {
		res.json({ veeqo_customer: result })
	} else {
		res.status(400).json({ error: 'Failed to sync customer' })
	}
}
