import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncOrderToVeeqoWorkflow } from '../../../../../workflows/veeqo/order'
import { AdminSyncOrderToVeeqoType } from '../../../../validators'

// one-way sync of orders from medusa to veeqo
export const POST = async (
	req: AuthenticatedMedusaRequest<AdminSyncOrderToVeeqoType>,
	res: MedusaResponse
) => {
	const { order_ids } = req.validatedBody
	const results = await Promise.all(
		order_ids.map(orderId =>
			syncOrderToVeeqoWorkflow(req.scope).run({
				input: orderId
			})
		)
	)
	res.json({
		synced_order_ids: results.map(({ result }) => result?.id).filter(Boolean)
	})
}
