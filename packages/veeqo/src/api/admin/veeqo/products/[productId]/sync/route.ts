import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncProductToVeeqoWorkflow } from '../../../../../../workflows/veeqo/product'

// one-way sync of a product from medusa to veeqo
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { productId } = req.params
	const { result } = await syncProductToVeeqoWorkflow(req.scope).run({
		input: productId
	})
	if (result) {
		res.json({ veeqo_product: result })
	} else {
		res.status(400).json({ error: 'Failed to sync product' })
	}
}
