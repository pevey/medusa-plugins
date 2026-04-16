import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { WEBHOOK_MODULE } from '../../../../../../../modules/webhook'
import { WebhookService } from '../../../../../../../modules/webhook/service'
import { AdminUpsertWebhookQueryType } from '../../../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { actionId } = req.params

	const queries = await webhookService.listWebhookQueries({ action_id: actionId }, { take: 1 })
	res.json({ query: queries[0] ?? null })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpsertWebhookQueryType>,
	res: MedusaResponse
) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { actionId } = req.params
	const body = req.validatedBody

	const clampedLimit = body.limit !== undefined ? Math.min(body.limit, 100) : 10

	const [existing] = await webhookService.listWebhookQueries({ action_id: actionId }, { take: 1 })

	let query
	if (existing) {
		query = await webhookService.updateWebhookQueries({
			id: existing.id,
			...body,
			limit: clampedLimit
		} as any)
	} else {
		query = await webhookService.createWebhookQueries({
			...body,
			limit: clampedLimit,
			action_id: actionId
		} as any)
	}

	res.json({ query })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { actionId } = req.params

	const [existing] = await webhookService.listWebhookQueries({ action_id: actionId }, { take: 1 })
	if (existing) {
		await webhookService.deleteWebhookQueries(existing.id)
	}

	res.json({ deleted: true })
}
