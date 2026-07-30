// Public (unauthenticated) endpoint for trigger_type === 'incoming_webhook'.
// External services POST here; the payload is verified, then each active action
// is dispatched via the shared dispatch pipeline.
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AUTOMATION_MODULE } from '../../../modules/automation'
import { AutomationService } from '../../../modules/automation/service'
import { AutomationTriggerType, SignatureConfig } from '../../../modules/automation/models/automation-trigger'
import { redactPayload } from '../../../modules/automation/models/automation-receipt'
import { dispatchAndRecord } from '../../../lib/dispatch'
import { verifySignature } from '../../../lib/signature'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { id } = req.params

	// Payload size is enforced upstream by the bodyParser (see middlewares.ts);
	// anything over the limit returns 413 before reaching this handler.

	const [trigger] = await automationService.listAutomationTriggers({ id }, { take: 1 })

	if (!trigger || trigger.trigger_type !== AutomationTriggerType.INCOMING_WEBHOOK || !trigger.is_active) {
		return res.status(404).json({ error: 'Webhook not found or not active' })
	}

	// Verify HMAC signature if a signing key is configured. Verification
	// honors the per-trigger SignatureConfig (header name, encoding,
	// prefix, signed-input template, optional replay window). HMAC is
	// computed over the raw request bytes captured by preserveRawBody —
	// re-serializing req.body would normalize whitespace/key order and
	// reject otherwise-valid signatures.
	if (trigger.trigger_signing_key) {
		const rawBody = (req as MedusaRequest & { rawBody?: Buffer }).rawBody
		if (!rawBody) {
			return res.status(400).json({ error: 'Raw body unavailable for signature verification' })
		}
		const signingKey = automationService.decryptSecret(trigger.trigger_signing_key)
		const sigConfig = (trigger as any).signature_config as SignatureConfig | null
		const result = verifySignature(req.headers, rawBody, signingKey, sigConfig)
		if (!result.ok) {
			return res.status(result.status).json({ error: result.error })
		}

		// In-window replay dedup. Only active when the trigger has a
		// timestamp_header configured — without one we have no defined
		// window to bound the cache TTL. Uses the signature header value
		// as the dedup key (already unique per body + timestamp).
		if (sigConfig?.timestamp_header && (sigConfig.tolerance_seconds ?? 0) > 0) {
			const headerName = (sigConfig.header ?? 'x-webhook-signature').toLowerCase()
			const sigValue = req.headers[headerName] as string | undefined
			if (sigValue) {
				const seen = automationService.getSignatureCache().checkAndRecord(trigger.id, sigValue, sigConfig.tolerance_seconds!)
				if (seen) {
					return res.status(409).json({ error: 'Replayed signature' })
				}
			}
		}
	}

	const incomingPayload = req.body as Record<string, unknown>

	// Log the receipt if enabled for this trigger
	if ((trigger as any).log_incoming) {
		const requestIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? null
		await automationService.createAutomationReceipts({
			trigger_id: trigger.id,
			request_ip: requestIp,
			payload: redactPayload(incomingPayload)
		} as any)
	}

	// Load all active actions for this trigger
	const [actions] = await automationService.listAndCountAutomationActions({
		trigger_id: trigger.id,
		is_active: true
	})

	if (actions.length === 0) {
		return res.status(200).json({ received: true, actions_executed: 0 })
	}

	// Incoming webhooks don't sign outgoing payloads and don't do query augmentation
	const opts = {
		signOutgoing: false,
		maxWorkflowIterations: automationService.getOptions().maxWorkflowIterations
	}

	const results = await Promise.allSettled(
		actions.map(action => dispatchAndRecord(req.scope, action, incomingPayload, `incoming_webhook:${action.name}`, opts))
	)

	const anyFailed = results.some(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed'))

	res.status(anyFailed ? 207 : 200).json({
		received: true,
		actions_executed: actions.length
	})
}
