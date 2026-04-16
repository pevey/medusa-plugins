import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { WEBHOOK_MODULE } from '../../../../../../../modules/webhook'
import { WebhookService } from '../../../../../../../modules/webhook/service'
import { AdminGetWebhookDeliveriesType } from '../../../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { actionId } = req.params
	const { limit, offset, status } = req.validatedQuery as AdminGetWebhookDeliveriesType

	const [deliveries, count] = await webhookService.listAndCountWebhookDeliveries(
		{ action_id: actionId, ...(status ? { status } : {}) },
		{
			skip: offset ?? 0,
			take: limit ?? 20,
			order: { created_at: 'DESC' }
		}
	)

	res.json({ deliveries, count, limit: limit ?? 20, offset: offset ?? 0 })
}
