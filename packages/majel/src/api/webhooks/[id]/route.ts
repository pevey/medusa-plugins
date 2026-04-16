// Public (unauthenticated) endpoint for trigger_type === 'incoming_webhook'.
// External services POST here; the payload is verified, field-mapped per action,
// then each active action (outgoing HTTP POST or Medusa workflow) is executed.
import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { createHmac, timingSafeEqual } from 'crypto'
import * as coreFlows from '@medusajs/medusa/core-flows'
import { WEBHOOK_MODULE } from '../../../modules/webhook'
import { WebhookService } from '../../../modules/webhook/service'
import { WebhookTriggerType } from '../../../modules/webhook/models/webhook-trigger'
import { WebhookActionType, FieldMapping } from '../../../modules/webhook/models/webhook-action'
import { redactPayload } from '../../../modules/webhook/models/webhook-receipt'

type StaticValue = { key: string; value: string }
import { WebhookDeliveryStatus } from '../../../modules/webhook/models/webhook-delivery'

// ─── Payload size helper ──────────────────────────────────────────────────────

function parseMaxBytes(value: string | number | undefined): number {
	if (value === undefined) return 100 * 1024 // 100kb default
	if (typeof value === 'number') return value
	const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb|b)?$/i)
	if (!match) return 100 * 1024
	const num = parseFloat(match[1])
	const unit = (match[2] ?? 'b').toLowerCase()
	const multipliers: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }
	return Math.floor(num * (multipliers[unit] ?? 1))
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path.split('.').reduce((curr: unknown, key: string) => {
		if (curr !== null && typeof curr === 'object') {
			return (curr as Record<string, unknown>)[key]
		}
		return undefined
	}, obj)
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
	const keys = path.split('.')
	let curr = obj
	for (let i = 0; i < keys.length - 1; i++) {
		if (!(keys[i] in curr) || typeof curr[keys[i]] !== 'object') {
			curr[keys[i]] = {}
		}
		curr = curr[keys[i]] as Record<string, unknown>
	}
	curr[keys[keys.length - 1]] = value
}

// Simple mapping for outgoing webhooks — no coercion, no fan-out.
function applyMappings(
	source: Record<string, unknown>,
	mappings: FieldMapping[]
): Record<string, unknown> {
	if (!mappings || mappings.length === 0) return source
	const result: Record<string, unknown> = {}
	for (const mapping of mappings) {
		const value = getNestedValue(source, mapping.source_path)
		if (value !== undefined) setNestedValue(result, mapping.target_key, value)
	}
	return result
}

// Mapping for workflow single-call path — coerces source to array when target
// key ends with `[]` (e.g. `customersData[]`) and source is not already an array.
function applyMappingsWithCoercion(
	source: Record<string, unknown>,
	mappings: FieldMapping[]
): Record<string, unknown> {
	if (!mappings || mappings.length === 0) return source
	const result: Record<string, unknown> = {}
	for (const mapping of mappings) {
		let value = getNestedValue(source, mapping.source_path)
		if (value === undefined) continue
		let targetKey = mapping.target_key
		if (targetKey.endsWith('[]')) {
			targetKey = targetKey.slice(0, -2)
			if (!Array.isArray(value)) value = [value]
		}
		setNestedValue(result, targetKey, value)
	}
	return result
}

function applyStaticValues(
	base: Record<string, unknown>,
	statics: StaticValue[]
): Record<string, unknown> {
	if (!statics || statics.length === 0) return base
	const result = { ...base }
	for (const s of statics) {
		if (s.key) setNestedValue(result, s.key, s.value)
	}
	return result
}

// Recursively flatten a nested object to dot-notation key/value string pairs
// for use as URL query parameters.
function flattenForQueryParams(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
	const result: Record<string, string> = {}
	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key
		if (
			value !== null &&
			value !== undefined &&
			typeof value === 'object' &&
			!Array.isArray(value)
		) {
			Object.assign(result, flattenForQueryParams(value as Record<string, unknown>, fullKey))
		} else if (value !== null && value !== undefined) {
			result[fullKey] = String(value)
		}
	}
	return result
}

// ─── Fan-out helpers ──────────────────────────────────────────────────────────

type FanoutMapping = {
	arrayPath: string // e.g. "customers" from "customers[].id"
	itemPath: string // e.g. "id" from "customers[].id" (empty = whole item)
	targetKey: string
}

// Parse mappings that contain [] in source path into fan-out descriptors.
function parseFanoutMappings(mappings: FieldMapping[]): FanoutMapping[] {
	const result: FanoutMapping[] = []
	for (const m of mappings) {
		const match = m.source_path.match(/^(.+?)\[\]\.?(.*)$/)
		if (match) {
			result.push({ arrayPath: match[1], itemPath: match[2], targetKey: m.target_key })
		}
	}
	return result
}

// Build the workflow input for a single iteration item.
// Fan-out mappings resolve fields from the current item.
// Direct mappings resolve from the full sourceData (global context).
function buildIterationPayload(
	item: unknown,
	fanout: FanoutMapping[],
	direct: FieldMapping[],
	sourceData: Record<string, unknown>
): Record<string, unknown> {
	const result: Record<string, unknown> = {}

	for (const m of direct) {
		let value = getNestedValue(sourceData, m.source_path)
		if (value === undefined) continue
		let targetKey = m.target_key
		if (targetKey.endsWith('[]')) {
			targetKey = targetKey.slice(0, -2)
			if (!Array.isArray(value)) value = [value]
		}
		setNestedValue(result, targetKey, value)
	}

	for (const f of fanout) {
		let value = f.itemPath ? getNestedValue(item as Record<string, unknown>, f.itemPath) : item
		if (value === undefined) continue
		let targetKey = f.targetKey
		if (targetKey.endsWith('[]')) {
			targetKey = targetKey.slice(0, -2)
			if (!Array.isArray(value)) value = [value]
		}
		setNestedValue(result, targetKey, value)
	}

	return result
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
	const webhookService = req.scope.resolve(WEBHOOK_MODULE) as WebhookService
	const { id } = req.params

	// Enforce configurable payload size limit before doing any DB work
	const maxBytes = parseMaxBytes(webhookService.getOptions().maxPayloadSize)
	const bodyBytes = Buffer.byteLength(JSON.stringify(req.body ?? ''))
	if (bodyBytes > maxBytes) {
		return res.status(413).json({ error: 'Payload too large' })
	}

	const [trigger] = await webhookService.listWebhookTriggers({ id }, { take: 1 })

	if (
		!trigger ||
		trigger.trigger_type !== WebhookTriggerType.INCOMING_WEBHOOK ||
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
				!timingSafeEqual(sigBuffer, expectedBuffer)
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
		await webhookService.createWebhookReceipts({
			trigger_id: trigger.id,
			request_ip: requestIp,
			payload: redactPayload(incomingPayload)
		} as any)
	}

	// Load all active actions for this trigger
	const [actions] = await webhookService.listAndCountWebhookActions({
		trigger_id: trigger.id,
		is_active: true
	})

	if (actions.length === 0) {
		return res.status(200).json({ received: true, actions_executed: 0 })
	}

	const results = await Promise.allSettled(
		actions.map(async action => {
			const mappings: FieldMapping[] = Array.isArray(action.field_mappings)
				? (action.field_mappings as FieldMapping[])
				: []
			const statics: StaticValue[] = Array.isArray((action as any).static_values)
				? ((action as any).static_values as StaticValue[])
				: []

			let deliveryStatus = WebhookDeliveryStatus.PENDING
			let responseStatus: number | null = null
			let responseBody: string | null = null
			let errorMessage: string | null = null
			let eventLabel = `incoming_webhook:${action.name}`

			try {
				if (action.action_type === WebhookActionType.OUTGOING_WEBHOOK) {
					// ── Outgoing webhook — simple mapping, no fan-out ──────────────
					if (!action.target_url) throw new Error('No target URL configured')

					const dynamicPayload = applyMappings(incomingPayload, mappings)
					const mappedPayload = applyStaticValues(dynamicPayload, statics)

					const headers: Record<string, string> = { 'Content-Type': 'application/json' }
					if (Array.isArray(action.target_headers)) {
						for (const h of action.target_headers as Array<{ key: string; value: string }>) {
							if (h.key) headers[h.key] = h.value
						}
					}

					const controller = new AbortController()
					const timeout = setTimeout(() => controller.abort(), 10000)

					const response = await fetch(action.target_url, {
						method: 'POST',
						headers,
						body: JSON.stringify(mappedPayload),
						signal: controller.signal
					})

					clearTimeout(timeout)
					responseStatus = response.status
					responseBody = await response.text().catch(() => null)
					eventLabel = action.target_url
					deliveryStatus = response.ok
						? WebhookDeliveryStatus.SUCCESS
						: WebhookDeliveryStatus.FAILED
					if (!response.ok) {
						errorMessage = `HTTP ${response.status}: ${responseBody?.slice(0, 200) ?? 'no body'}`
					}
				} else if ((action.action_type as string) === 'outgoing_request') {
					// ── Outgoing request — configurable method, query params for GET/DELETE ──
					if (!action.target_url) throw new Error('No target URL configured')

					const method = ((action as any).request_method as string) || 'POST'
					const dynamicPayload = applyMappings(incomingPayload, mappings)
					const mappedPayload = applyStaticValues(dynamicPayload, statics)

					const headers: Record<string, string> = {}
					if (Array.isArray(action.target_headers)) {
						for (const h of action.target_headers as Array<{ key: string; value: string }>) {
							if (h.key) headers[h.key] = h.value
						}
					}

					let requestUrl = action.target_url
					let requestBody: string | undefined

					if (method === 'GET' || method === 'DELETE') {
						const flat = flattenForQueryParams(mappedPayload)
						const qs = new URLSearchParams(flat).toString()
						if (qs) requestUrl = `${action.target_url}?${qs}`
					} else {
						headers['Content-Type'] = 'application/json'
						requestBody = JSON.stringify(mappedPayload)
					}

					const controller = new AbortController()
					const timeout = setTimeout(() => controller.abort(), 10000)

					const response = await fetch(requestUrl, {
						method,
						headers,
						body: requestBody,
						signal: controller.signal
					})

					clearTimeout(timeout)
					responseStatus = response.status
					responseBody = await response.text().catch(() => null)
					eventLabel = action.target_url
					deliveryStatus = response.ok
						? WebhookDeliveryStatus.SUCCESS
						: WebhookDeliveryStatus.FAILED
					if (!response.ok) {
						errorMessage = `HTTP ${response.status}: ${responseBody?.slice(0, 200) ?? 'no body'}`
					}
				} else if (action.action_type === WebhookActionType.MEDUSA_WORKFLOW) {
					// ── Medusa workflow — fan-out or single call with coercion ──────
					if (!action.medusa_workflow) throw new Error('No workflow configured')

					const workflowFn = (coreFlows as Record<string, unknown>)[action.medusa_workflow]
					if (typeof workflowFn !== 'function') {
						throw new Error(`Unknown workflow: "${action.medusa_workflow}"`)
					}

					const run = (
						workflowFn as (c: unknown) => { run: (o: { input: unknown }) => Promise<unknown> }
					)(req.scope).run

					eventLabel = action.medusa_workflow

					const fanoutMappings = parseFanoutMappings(mappings)

					if (fanoutMappings.length > 0) {
						// Fan-out: iterate over the source array, run workflow once per item
						const arrayPath = fanoutMappings[0].arrayPath
						const raw = getNestedValue(incomingPayload, arrayPath)
						const items: unknown[] = Array.isArray(raw)
							? raw
							: raw !== undefined && raw !== null
								? [raw]
								: []

						const maxIterOpt = webhookService.getOptions().maxWorkflowIterations
						const cap = maxIterOpt === 0 ? undefined : (maxIterOpt ?? 50)
						const cappedItems = cap !== undefined ? items.slice(0, cap) : items

						const directMappings = mappings.filter(m => !m.source_path.includes('[]'))
						const iterErrors: string[] = []

						for (const item of cappedItems) {
							const payload = buildIterationPayload(
								item,
								fanoutMappings,
								directMappings,
								incomingPayload
							)
							const finalPayload = applyStaticValues(payload, statics)
							try {
								await run({ input: finalPayload })
							} catch (err) {
								iterErrors.push(err instanceof Error ? err.message : String(err))
							}
						}

						if (iterErrors.length === 0) {
							deliveryStatus = WebhookDeliveryStatus.SUCCESS
						} else {
							deliveryStatus = WebhookDeliveryStatus.FAILED
							errorMessage = `${iterErrors.length}/${cappedItems.length} iterations failed: ${iterErrors.slice(0, 3).join('; ')}`
						}
					} else {
						// Single call — coerce source to array when target key ends with []
						const mappedPayload = applyMappingsWithCoercion(incomingPayload, mappings)
						const finalPayload = applyStaticValues(mappedPayload, statics)
						await run({ input: finalPayload })
						deliveryStatus = WebhookDeliveryStatus.SUCCESS
					}
				}
			} catch (err) {
				deliveryStatus = WebhookDeliveryStatus.FAILED
				errorMessage = err instanceof Error ? err.message : String(err)
			}

			await webhookService.createWebhookDeliveries({
				action_id: action.id,
				event_name: eventLabel,
				request_payload: incomingPayload,
				response_status: responseStatus,
				response_body: responseBody,
				status: deliveryStatus,
				attempts: 1,
				error_message: errorMessage
			} as any)

			return deliveryStatus
		})
	)

	const anyFailed = results.some(
		r =>
			r.status === 'rejected' ||
			(r.status === 'fulfilled' && r.value === WebhookDeliveryStatus.FAILED)
	)

	res.status(anyFailed ? 207 : 200).json({
		received: true,
		actions_executed: actions.length
	})
}
