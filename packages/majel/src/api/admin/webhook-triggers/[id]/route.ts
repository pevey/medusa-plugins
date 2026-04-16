import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'
import { WEBHOOK_MODULE } from '../../../../modules/webhook'
import { WebhookService } from '../../../../modules/webhook/service'
import { AdminUpdateWebhookTriggerType } from '../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { id } = req.params

	const [trigger] = await webhookService.listWebhookTriggers({ id }, { take: 1 })
	if (!trigger) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `WebhookTrigger with id ${id} not found`)
	}

	res.json({ trigger })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateWebhookTriggerType>,
	res: MedusaResponse
) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { id } = req.params

	const [existing] = await webhookService.listWebhookTriggers({ id }, { take: 1 })
	if (!existing) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `WebhookTrigger with id ${id} not found`)
	}

	const trigger = await (webhookService.updateWebhookTriggers({
		id,
		...req.validatedBody
	} as any) as any)
	res.json({ trigger })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { id } = req.params
	await webhookService.deleteWebhookTriggers([id])
	res.json({ deleted: [id] })
}
