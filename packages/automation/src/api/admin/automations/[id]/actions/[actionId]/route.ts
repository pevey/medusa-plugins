import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'
import { AUTOMATION_MODULE } from '../../../../../../modules/automation'
import { AutomationService } from '../../../../../../modules/automation/service'
import { isBlockedWorkflowName } from '../../../../../../lib/workflow-guard'
import { AdminUpdateAutomationActionType } from '../../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { actionId } = req.params

	const [found] = await automationService.listAutomationActions({ id: actionId }, { take: 1 })
	if (!found) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `AutomationAction with id ${actionId} not found`)
	}

	// Strip `deleted_at` (soft-delete internal) and the `trigger`/`query` relation stubs —
	// nothing in the admin UI reads `.trigger`/`.query` on an action.
	const { deleted_at, trigger, query, ...action } = found as any
	res.json({ action })
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateAutomationActionType>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { actionId } = req.params

	const [existing] = await automationService.listAutomationActions({ id: actionId }, { take: 1 })
	if (!existing) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `AutomationAction with id ${actionId} not found`)
	}

	// SSRF save-time check — re-validate target_url if the update touches it.
	if (req.validatedBody.target_url) {
		const validation = automationService.getSsrfGuard().validateUrl(req.validatedBody.target_url)
		if (!validation.ok) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, validation.error)
		}
	}

	// Workflow guard: refuse to update an action to use a destructive workflow.
	if (isBlockedWorkflowName(req.validatedBody.medusa_workflow)) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Workflow "${req.validatedBody.medusa_workflow}" is blocked: destructive workflows cannot be invoked from automation actions.`
		)
	}

	const updated = await (automationService.updateAutomationActions({
		id: actionId,
		...req.validatedBody
	} as any) as any)
	// Strip `deleted_at` (soft-delete internal) and the `trigger`/`query` relation stubs —
	// nothing in the admin UI reads `.trigger`/`.query` on an action.
	const { deleted_at, trigger, query, ...action } = updated as any
	res.json({ action })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { actionId } = req.params
	await automationService.deleteAutomationActions([actionId])
	res.json({ deleted: [actionId] })
}
