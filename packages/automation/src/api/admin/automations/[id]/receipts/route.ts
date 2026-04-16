import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AUTOMATION_MODULE } from '../../../../../modules/automation'
import { AutomationService } from '../../../../../modules/automation/service'
import { AdminGetAutomationReceiptsType } from '../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { id } = req.params
	const { limit, offset } = req.validatedQuery as AdminGetAutomationReceiptsType

	const [receipts, count] = await automationService.listAndCountAutomationReceipts(
		{ trigger_id: id },
		{
			skip: offset ?? 0,
			take: limit ?? 20,
			order: { created_at: 'DESC' }
		}
	)

	res.json({ receipts, count, limit: limit ?? 20, offset: offset ?? 0 })
}
