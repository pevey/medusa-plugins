import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { WEBHOOK_MODULE } from '../../../modules/webhook'
import { WebhookService } from '../../../modules/webhook/service'
import {
	AdminGetWebhookTriggersType,
	AdminCreateWebhookTriggerType,
	AdminDeleteWebhookTriggersType
} from '../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { limit, offset, q, trigger_type, is_active } =
		req.validatedQuery as AdminGetWebhookTriggersType

	const filters: Record<string, unknown> = {}
	if (trigger_type) filters.trigger_type = trigger_type
	if (is_active !== undefined) filters.is_active = is_active
	if (q) filters.name = { $ilike: `%${q}%` }

	const [triggers, count] = await webhookService.listAndCountWebhookTriggers(filters, {
		skip: offset ?? 0,
		take: limit ?? 20,
		order: { created_at: 'DESC' }
	})

	res.json({ triggers, count, limit: limit ?? 20, offset: offset ?? 0 })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateWebhookTriggerType>,
	res: MedusaResponse
) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const trigger = await webhookService.createWebhookTriggers(req.validatedBody as any)
	res.json({ trigger })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteWebhookTriggersType>,
	res: MedusaResponse
) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { ids } = req.validatedBody
	await webhookService.deleteWebhookTriggers(ids)
	res.json({ deleted: ids })
}
