// Public (unauthenticated) endpoint for trigger_type === 'incoming_webhook'.
// External services POST here; the payload is verified, then each active action
// is dispatched via the shared dispatch pipeline.
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { createHmac, timingSafeEqual } from 'crypto'
import { AUTOMATION_MODULE } from '../../../modules/automation'
import { AutomationService } from '../../../modules/automation/service'
import { AutomationTriggerType } from '../../../modules/automation/models/automation-trigger'
import { redactPayload } from '../../../modules/automation/models/automation-receipt'
import { parseMaxBytes, dispatchAndRecord } from '../../../lib/dispatch'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { id } = req.params

	// Enforce configurable payload size limit before doing any DB work
	const maxBytes = parseMaxBytes(automationService.getOptions().maxPayloadSize)
	const bodyBytes = Buffer.byteLength(JSON.stringify(req.body ?? ''))
	if (bodyBytes > maxBytes) {
		return res.status(413).json({ error: 'Payload too large' })
	}

	const [trigger] = await automationService.listAutomationTriggers({ id }, { take: 1 })

	if (
		!trigger ||
		trigger.trigger_type !== AutomationTriggerType.INCOMING_WEBHOOK ||
		!trigger.is_active
	) {
		return res.status(404).json({ error: 'Webhook not found or not active' })
	}

	// Verify HMAC-SHA256 signature if a signing key is configured
	if (trigger.trigger_signing_key) {
		const signature = req.headers['x-webhook-signature'] as string
		if (!signature) {
			return res.status(401).json({ error: 'Missing x-webhook-signature header' })
		}
		const expected = createHmac('sha256', trigger.trigger_signing_key)
			.update(JSON.stringify(req.body))
			.digest('hex')
		try {
			const sigBuffer = Buffer.from(signature)
			const expectedBuffer = Buffer.from(expected)
			if (
				sigBuffer.length !== expectedBuffer.length ||
				!timingSafeEqual(new Uint8Array(sigBuffer), new Uint8Array(expectedBuffer))
			) {
				return res.status(401).json({ error: 'Invalid signature' })
			}
		} catch {
			return res.status(401).json({ error: 'Invalid signature' })
		}
	}

	const incomingPayload = req.body as Record<string, unknown>

	// Log the receipt if enabled for this trigger
	if ((trigger as any).log_incoming) {
		const requestIp =
			(req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
			req.socket?.remoteAddress ??
			null
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
		actions.map(action =>
			dispatchAndRecord(req.scope, action, incomingPayload, `incoming_webhook:${action.name}`, opts)
		)
	)

	const anyFailed = results.some(
		r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed')
	)

	res.status(anyFailed ? 207 : 200).json({
		received: true,
		actions_executed: actions.length
	})
}
