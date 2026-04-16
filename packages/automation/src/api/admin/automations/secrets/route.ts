import { randomBytes } from 'crypto'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AUTOMATION_MODULE } from '../../../../modules/automation'
import { AutomationService } from '../../../../modules/automation/service'
import { AdminCreateAutomationSecretType, AdminGetAutomationSecretsType } from '../../../validators'

// GET /admin/automations/secrets — list all secrets (label + id only, never the secret value)
export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetAutomationSecretsType>,
	res: MedusaResponse
) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const [secrets, count] = await automationService.listAndCountAutomationSecrets(
		{},
		{ take: req.validatedQuery?.limit ?? 100, skip: req.validatedQuery?.offset ?? 0 }
	)
	res.json({
		secrets: secrets.map(({ id, label, created_at, updated_at }: any) => ({
			id,
			label,
			created_at,
			updated_at
		})),
		count
	})
}

// POST /admin/automations/secrets — create a new secret, return the secret value once
export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateAutomationSecretType>,
	res: MedusaResponse
) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { label } = req.validatedBody
	const secret = randomBytes(32).toString('hex')
	const created = await automationService.createAutomationSecrets({ label, secret })
	// Return the secret value exactly once — it is never returned again
	res.json({
		secret: {
			id: created.id,
			label: created.label,
			secret: created.secret,
			created_at: created.created_at
		}
	})
}
