import { randomBytes } from 'crypto'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { WEBHOOK_MODULE } from '../../../modules/webhook'
import { WebhookService } from '../../../modules/webhook/service'
import { AdminCreateWebhookSecretType, AdminGetWebhookSecretsType } from '../../validators'

// GET /admin/webhook-secrets — list all secrets (label + id only, never the secret value)
export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetWebhookSecretsType>,
	res: MedusaResponse
) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const [secrets, count] = await webhookService.listAndCountWebhookSecrets(
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

// POST /admin/webhook-secrets — create a new secret, return the secret value once
export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateWebhookSecretType>,
	res: MedusaResponse
) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { label } = req.validatedBody
	const secret = randomBytes(32).toString('hex')
	const created = await webhookService.createWebhookSecrets({ label, secret })
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
