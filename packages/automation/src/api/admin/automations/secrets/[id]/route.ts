import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AUTOMATION_MODULE } from '../../../../../modules/automation'
import { AutomationService } from '../../../../../modules/automation/service'

// DELETE /admin/automations/secrets/:id
export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { id } = req.params
	await automationService.deleteAutomationSecrets(id)
	res.json({ deleted: [id] })
}
