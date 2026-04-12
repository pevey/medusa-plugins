import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncProductToVeeqoWorkflow } from '../../../../../workflows/veeqo/product'
import { AdminSyncProductToVeeqoType } from '../../../../validators'

// one-way sync of products from medusa to veeqo
export const POST = async (
	req: AuthenticatedMedusaRequest<AdminSyncProductToVeeqoType>,
	res: MedusaResponse
) => {
	const { product_ids } = req.validatedBody
	const results = await Promise.all(
		product_ids.map(productId =>
			syncProductToVeeqoWorkflow(req.scope).run({
				input: productId
			})
		)
	)
	res.json({ synced_product_ids: results.map(({ result }) => result?.id).filter(Boolean) })
}
