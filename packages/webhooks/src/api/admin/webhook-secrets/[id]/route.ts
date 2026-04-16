import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { WEBHOOK_MODULE } from '../../../../modules/webhook'
import { WebhookService } from '../../../../modules/webhook/service'

// DELETE /admin/webhook-secrets/:id
export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { id } = req.params
	await webhookService.deleteWebhookSecrets(id)
	res.json({ deleted: [id] })
}
