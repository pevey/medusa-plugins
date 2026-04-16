import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { WEBHOOK_MODULE } from '../../../../../modules/webhook'
import { WebhookService } from '../../../../../modules/webhook/service'
import { AdminGetWebhookReceiptsType } from '../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { id } = req.params
	const { limit, offset } = req.validatedQuery as AdminGetWebhookReceiptsType

	const [receipts, count] = await webhookService.listAndCountWebhookReceipts(
		{ trigger_id: id },
		{
			skip: offset ?? 0,
			take: limit ?? 20,
			order: { created_at: 'DESC' }
		}
	)

	res.json({ receipts, count, limit: limit ?? 20, offset: offset ?? 0 })
}
