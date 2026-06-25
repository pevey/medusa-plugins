import { model } from '@medusajs/framework/utils'
import { AutomationAction } from './automation-action'
import { AutomationReceipt } from './automation-receipt'

export enum AutomationTriggerType {
	MEDUSA_EVENT = 'medusa_event',
	INCOMING_WEBHOOK = 'incoming_webhook'
}

export type SignatureEncoding = 'hex' | 'base64'

/**
 * Per-trigger configuration controlling how the incoming HMAC signature is
 * extracted, decoded, and what input it covers. All fields are optional;
 * defaults reproduce the simple "x-webhook-signature: <hex>(raw body)" form.
 */
export type SignatureConfig = {
	/** Header to read the signature from. Default: 'x-webhook-signature'. */
	header?: string
	/** Encoding of the signature bytes inside the header. Default: 'hex'. */
	encoding?: SignatureEncoding
	/** Prefix to strip from the header value before decoding, e.g. 'sha256='. */
	prefix?: string
	/** Template for the signed input. Supports {body} and {ts}. Default: '{body}'. */
	template?: string
	/** Header to read the timestamp from for {ts} substitution and replay checks. */
	timestamp_header?: string
	/** Max age in seconds for the timestamp. 0 or missing disables the check. */
	tolerance_seconds?: number
}

export const AutomationTrigger = model
	.define('automationTrigger', {
		id: model.id().primaryKey(),
		name: model.text(),
		description: model.text().nullable(),
		is_active: model.boolean().default(true),
		trigger_type: model.enum(AutomationTriggerType),
		trigger_events: model.json().nullable(),       // string[] — for medusa_event
		trigger_signing_key: model.text().nullable(),  // encrypted HMAC key — for incoming_webhook
		signature_config: model.json().nullable(),     // SignatureConfig — overrides defaults per sender
		log_incoming: model.boolean().default(false),  // log incoming payloads as AutomationReceipts
		metadata: model.json().nullable(),
		actions: model.hasMany(() => AutomationAction, { mappedBy: 'trigger' }),
		receipts: model.hasMany(() => AutomationReceipt, { mappedBy: 'trigger' })
	})
	.cascades({ delete: ['actions', 'receipts'] })
