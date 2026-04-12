import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { syncCustomerToVeeqoWorkflow } from '../../../../../workflows/veeqo/customer'
import { AdminSyncCustomerToVeeqoType } from '../../../../validators'

// one-way sync of customers from medusa to veeqo
export const POST = async (
	req: AuthenticatedMedusaRequest<AdminSyncCustomerToVeeqoType>,
	res: MedusaResponse
) => {
	const { customer_ids } = req.validatedBody
	const results = await Promise.all(
		customer_ids.map(customerId =>
			syncCustomerToVeeqoWorkflow(req.scope).run({
				input: customerId
			})
		)
	)
	res.json({
		synced_customer_ids: results.map(({ result }) => result?.id).filter(Boolean)
	})
}
