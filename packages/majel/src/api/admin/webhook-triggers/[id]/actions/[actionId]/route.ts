import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'
import { WEBHOOK_MODULE } from '../../../../../../modules/webhook'
import { WebhookService } from '../../../../../../modules/webhook/service'
import { AdminUpdateWebhookActionType } from '../../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { actionId } = req.params

	const [action] = await webhookService.listWebhookActions({ id: actionId }, { take: 1 })
	if (!action) {
		throw new MedusaError(
			MedusaError.Types.NOT_FOUND,
			`WebhookAction with id ${actionId} not found`
		)
	}

	res.json({ action })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateWebhookActionType>,
	res: MedusaResponse
) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { actionId } = req.params

	const [existing] = await webhookService.listWebhookActions({ id: actionId }, { take: 1 })
	if (!existing) {
		throw new MedusaError(
			MedusaError.Types.NOT_FOUND,
			`WebhookAction with id ${actionId} not found`
		)
	}

	const action = await (webhookService.updateWebhookActions({
		id: actionId,
		...req.validatedBody
	} as any) as any)
	res.json({ action })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { actionId } = req.params
	await webhookService.deleteWebhookActions([actionId])
	res.json({ deleted: [actionId] })
}
