import { model } from '@medusajs/framework/utils'
import { WebhookTrigger } from './webhook-trigger'

const REDACT_KEYS = ['password', 'pass', 'apikey', 'secret']

function shouldRedact(key: string): boolean {
	const lower = key.toLowerCase()
	return REDACT_KEYS.some(k => lower.includes(k))
}

export function redactPayload(obj: unknown): unknown {
	if (obj === null || typeof obj !== 'object') return obj
	if (Array.isArray(obj)) return obj.map(redactPayload)
	const result: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
		result[k] = shouldRedact(k) ? '[REDACTED]' : redactPayload(v)
	}
	return result
}

export const WebhookReceipt = model.define('webhookReceipt', {
	id: model.id().primaryKey(),
	trigger: model.belongsTo(() => WebhookTrigger, { mappedBy: 'receipts' }),
	request_ip: model.text().nullable(),
	payload: model.json().nullable() // redacted before storage
})
