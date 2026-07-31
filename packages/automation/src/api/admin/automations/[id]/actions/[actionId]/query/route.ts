import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AUTOMATION_MODULE } from '../../../../../../../modules/automation'
import { AutomationService } from '../../../../../../../modules/automation/service'
import { AdminUpsertAutomationQueryType } from '../../../../../../validators'

// Strip `deleted_at` (soft-delete internal) and the `action` relation stub — nothing in the
// admin UI reads `.action` on a query config; `action_id` (the scalar FK) is kept.
function toSafeQuery(q: any): any {
	if (!q) return null
	const { deleted_at, action, ...rest } = q
	return rest
}

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { actionId } = req.params

	const queries = await automationService.listAutomationQueries({ action_id: actionId }, { take: 1 })
	res.json({ query: toSafeQuery(queries[0]) })
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminUpsertAutomationQueryType>, res: MedusaResponse) => {
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

	res.json({ query: toSafeQuery(query) })
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
