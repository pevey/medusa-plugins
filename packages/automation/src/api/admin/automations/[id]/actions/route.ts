import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'
import { AUTOMATION_MODULE } from '../../../../../modules/automation'
import { AutomationService } from '../../../../../modules/automation/service'
import {
	AdminGetAutomationActionsType,
	AdminCreateAutomationActionType,
	AdminDeleteAutomationActionsType
} from '../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { id: trigger_id } = req.params
	const { limit, offset, action_type, is_active } =
		req.validatedQuery as AdminGetAutomationActionsType

	const filters: Record<string, unknown> = { trigger_id }
	if (action_type) filters.action_type = action_type
	if (is_active !== undefined) filters.is_active = is_active

	const [actions, count] = await automationService.listAndCountAutomationActions(filters, {
		skip: offset ?? 0,
		take: limit ?? 20,
		order: { created_at: 'DESC' }
	})

	res.json({ actions, count, limit: limit ?? 20, offset: offset ?? 0 })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateAutomationActionType>,
	res: MedusaResponse
) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { id: trigger_id } = req.params

	const [trigger] = await automationService.listAutomationTriggers({ id: trigger_id }, { take: 1 })
	if (!trigger) {
		throw new MedusaError(
			MedusaError.Types.NOT_FOUND,
			`AutomationTrigger with id ${trigger_id} not found`
		)
	}

	const action = await automationService.createAutomationActions({
		...req.validatedBody,
		trigger_id
	} as any)
	res.json({ action })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteAutomationActionsType>,
	res: MedusaResponse
) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { ids } = req.validatedBody
	await automationService.deleteAutomationActions(ids)
	res.json({ deleted: ids })
}
