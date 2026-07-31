import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AUTOMATION_MODULE } from '../../../modules/automation'
import { AutomationService } from '../../../modules/automation/service'
import { AdminGetAutomationTriggersType, AdminCreateAutomationTriggerType, AdminDeleteAutomationTriggersType } from '../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<never>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { limit, offset, q, trigger_type, is_active } = req.validatedQuery as AdminGetAutomationTriggersType

	const filters: Record<string, unknown> = {}
	if (trigger_type) filters.trigger_type = trigger_type
	if (is_active !== undefined) filters.is_active = is_active
	if (q) filters.name = { $ilike: `%${q}%` }

	const [triggers, count] = await automationService.listAndCountAutomationTriggers(filters, {
		skip: offset ?? 0,
		take: limit ?? 20,
		order: { created_at: 'DESC' }
	})

	// Strip the raw ORM entity's internal-only columns before returning: `deleted_at` is a
	// soft-delete implementation detail with no admin-facing meaning here (this module never
	// exposes restore), and `trigger_signing_key` is swapped for the `has_signing_key` flag.
	const safe = triggers.map((t: any) => {
		const { trigger_signing_key, deleted_at, ...rest } = t
		return { ...rest, has_signing_key: Boolean(trigger_signing_key) }
	})

	res.json({ triggers: safe, count, limit: limit ?? 20, offset: offset ?? 0 })
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateAutomationTriggerType>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const body = { ...req.validatedBody }
	if (body.trigger_signing_key) {
		body.trigger_signing_key = automationService.encryptSecret(body.trigger_signing_key)
	}
	const trigger = await automationService.createAutomationTriggers(body as any)
	// Never echo the signing key back, even ciphertext — expose only presence. Also strip
	// `deleted_at` (soft-delete internal) and the `actions`/`receipts` hasMany relations —
	// MikroORM auto-initializes them to `[]` on a freshly created entity, which every other
	// trigger route (list/get/update) never returns, so leaving them in here would make this
	// one route's response shape inconsistent with the rest.
	const { trigger_signing_key, deleted_at, actions, receipts, ...safe } = trigger as any
	res.json({ trigger: { ...safe, has_signing_key: Boolean(trigger_signing_key) } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteAutomationTriggersType>, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { ids } = req.validatedBody
	await automationService.deleteAutomationTriggers(ids)
	res.json({ deleted: ids })
}
