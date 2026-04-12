import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncDeliveryMethodToVeeqoWorkflow } from '../../../../../workflows/veeqo/delivery-method'
import { AdminSyncShippingOptionsToVeeqoType } from '../../../../validators'

// one-way sync of shipping options from medusa to veeqo
export const POST = async (
	req: AuthenticatedMedusaRequest<AdminSyncShippingOptionsToVeeqoType>,
	res: MedusaResponse
) => {
	const { shipping_option_ids } = req.validatedBody
	const results = await Promise.all(
		shipping_option_ids.map(shippingOptionId =>
			syncDeliveryMethodToVeeqoWorkflow(req.scope).run({
				input: shippingOptionId
			})
		)
	)
	res.json({ synced_shipping_option_ids: results.map(({ result }) => result?.id).filter(Boolean) })
}
