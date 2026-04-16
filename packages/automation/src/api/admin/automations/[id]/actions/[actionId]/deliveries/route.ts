import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AUTOMATION_MODULE } from '../../../../../../../modules/automation'
import { AutomationService } from '../../../../../../../modules/automation/service'
import { AdminGetAutomationDeliveriesType } from '../../../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { actionId } = req.params
	const { limit, offset, status } = req.validatedQuery as AdminGetAutomationDeliveriesType

	const [deliveries, count] = await automationService.listAndCountAutomationDeliveries(
		{ action_id: actionId, ...(status ? { status } : {}) },
		{
			skip: offset ?? 0,
			take: limit ?? 20,
			order: { created_at: 'DESC' }
		}
	)

	res.json({ deliveries, count, limit: limit ?? 20, offset: offset ?? 0 })
}
