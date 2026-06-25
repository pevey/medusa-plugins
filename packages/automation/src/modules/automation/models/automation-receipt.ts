import { model } from '@medusajs/framework/utils'
import { AutomationTrigger } from './automation-trigger'

// Substring match (case-insensitive). Catches keys like 'api_key', 'apiKey',
// 'authorization', 'X-Auth-Token', 'access_token', 'session_id', etc.
const REDACT_KEYS = [
	'password',
	'pass',
	'secret',
	'token',
	'bearer',
	'authorization',
	'auth',
	'apikey',
	'api_key',
	'access_key',
	'accesskey',
	'private_key',
	'privatekey',
	'credential',
	'session',
	'jwt'
]

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

export const AutomationReceipt = model.define('automationReceipt', {
	id: model.id().primaryKey(),
	trigger: model.belongsTo(() => AutomationTrigger, { mappedBy: 'receipts' }),
	request_ip: model.text().nullable(),
	payload: model.json().nullable() // redacted before storage
})
