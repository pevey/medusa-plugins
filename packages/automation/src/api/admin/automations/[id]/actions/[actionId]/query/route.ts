import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AUTOMATION_MODULE } from '../../../../../../../modules/automation'
import { AutomationService } from '../../../../../../../modules/automation/service'
import { AdminUpsertAutomationQueryType } from '../../../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { actionId } = req.params

	const queries = await automationService.listAutomationQueries({ action_id: actionId }, { take: 1 })
	res.json({ query: queries[0] ?? null })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpsertAutomationQueryType>,
	res: MedusaResponse
) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { actionId } = req.params
	const body = req.validatedBody

	const clampedLimit = body.limit !== undefined ? Math.min(body.limit, 100) : 10

	const [existing] = await automationService.listAutomationQueries({ action_id: actionId }, { take: 1 })

	let query
	if (existing) {
		query = await automationService.updateAutomationQueries({
			id: existing.id,
			...body,
			limit: clampedLimit
		} as any)
	} else {
		query = await automationService.createAutomationQueries({
			...body,
			limit: clampedLimit,
			action_id: actionId
		} as any)
	}

	res.json({ query })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { actionId } = req.params

	const [existing] = await automationService.listAutomationQueries({ action_id: actionId }, { take: 1 })
	if (existing) {
		await automationService.deleteAutomationQueries(existing.id)
	}

	res.json({ deleted: true })
}
