import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'
import { WEBHOOK_MODULE } from '../../../../../modules/webhook'
import { WebhookService } from '../../../../../modules/webhook/service'
import {
	AdminGetWebhookActionsType,
	AdminCreateWebhookActionType,
	AdminDeleteWebhookActionsType
} from '../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { id: trigger_id } = req.params
	const { limit, offset, action_type, is_active } =
		req.validatedQuery as AdminGetWebhookActionsType

	const filters: Record<string, unknown> = { trigger_id }
	if (action_type) filters.action_type = action_type
	if (is_active !== undefined) filters.is_active = is_active

	const [actions, count] = await webhookService.listAndCountWebhookActions(filters, {
		skip: offset ?? 0,
		take: limit ?? 20,
		order: { created_at: 'DESC' }
	})

	res.json({ actions, count, limit: limit ?? 20, offset: offset ?? 0 })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateWebhookActionType>,
	res: MedusaResponse
) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { id: trigger_id } = req.params

	const [trigger] = await webhookService.listWebhookTriggers({ id: trigger_id }, { take: 1 })
	if (!trigger) {
		throw new MedusaError(
			MedusaError.Types.NOT_FOUND,
			`WebhookTrigger with id ${trigger_id} not found`
		)
	}

	const action = await webhookService.createWebhookActions({
		...req.validatedBody,
		trigger_id
	} as any)
	res.json({ action })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteWebhookActionsType>,
	res: MedusaResponse
) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { ids } = req.validatedBody
	await webhookService.deleteWebhookActions(ids)
	res.json({ deleted: ids })
}
