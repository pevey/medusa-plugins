import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AUTOMATION_MODULE } from '../../../modules/automation'
import { AutomationService } from '../../../modules/automation/service'
import {
	AdminGetAutomationTriggersType,
	AdminCreateAutomationTriggerType,
	AdminDeleteAutomationTriggersType
} from '../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { limit, offset, q, trigger_type, is_active } =
		req.validatedQuery as AdminGetAutomationTriggersType

	const filters: Record<string, unknown> = {}
	if (trigger_type) filters.trigger_type = trigger_type
	if (is_active !== undefined) filters.is_active = is_active
	if (q) filters.name = { $ilike: `%${q}%` }

	const [triggers, count] = await automationService.listAndCountAutomationTriggers(filters, {
		skip: offset ?? 0,
		take: limit ?? 20,
		order: { created_at: 'DESC' }
	})

	res.json({ triggers, count, limit: limit ?? 20, offset: offset ?? 0 })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateAutomationTriggerType>,
	res: MedusaResponse
) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const trigger = await automationService.createAutomationTriggers(req.validatedBody as any)
	res.json({ trigger })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteAutomationTriggersType>,
	res: MedusaResponse
) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { ids } = req.validatedBody
	await automationService.deleteAutomationTriggers(ids)
	res.json({ deleted: ids })
}
