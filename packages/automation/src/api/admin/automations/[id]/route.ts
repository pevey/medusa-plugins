import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'
import { AUTOMATION_MODULE } from '../../../../modules/automation'
import { AutomationService } from '../../../../modules/automation/service'
import { AdminUpdateAutomationTriggerType } from '../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { id } = req.params

	const [trigger] = await automationService.listAutomationTriggers({ id }, { take: 1 })
	if (!trigger) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `AutomationTrigger with id ${id} not found`)
	}

	const { trigger_signing_key, ...safe } = trigger as any
	res.json({ trigger: { ...safe, has_signing_key: Boolean(trigger_signing_key) } })
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateAutomationTriggerType>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { id } = req.params

	const [existing] = await automationService.listAutomationTriggers({ id }, { take: 1 })
	if (!existing) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `AutomationTrigger with id ${id} not found`)
	}

	const body = { ...req.validatedBody }
	if (body.trigger_signing_key) {
		body.trigger_signing_key = automationService.encryptSecret(body.trigger_signing_key)
	}

	const trigger = await (automationService.updateAutomationTriggers({
		id,
		...body
	} as any) as any)
	const { trigger_signing_key, ...safe } = trigger as any
	res.json({ trigger: { ...safe, has_signing_key: Boolean(trigger_signing_key) } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { id } = req.params
	await automationService.deleteAutomationTriggers([id])
	res.json({ deleted: [id] })
}
