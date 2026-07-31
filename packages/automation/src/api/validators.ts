import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'
import { AutomationTriggerType } from '../modules/automation/models/automation-trigger'
import { AutomationActionType, AutomationRequestMethod } from '../modules/automation/models/automation-action'

const FieldMappingSchema = z.object({
	source_path: z.string().min(1),
	target_key: z.string().min(1)
})

const TargetHeaderSchema = z.object({
	key: z.string().min(1),
	value: z.string()
})

const StaticValueSchema = z.object({
	key: z.string().min(1),
	value: z.string()
})

// ─── Automation Triggers ─────────────────────────────────────────────────────

const SignatureConfigSchema = z
	.object({
		header: z.string().min(1).optional(),
		encoding: z.enum(['hex', 'base64']).optional(),
		prefix: z.string().optional(),
		template: z.string().min(1).optional(),
		timestamp_header: z.string().min(1).optional(),
		tolerance_seconds: z.number().int().min(0).optional()
	})
	.superRefine((cfg, ctx) => {
		if (cfg.template && !cfg.template.includes('{body}')) {
			ctx.addIssue({
				code: 'custom',
				path: ['template'],
				message: 'Template must include {body}'
			})
		}
		if (cfg.template?.includes('{ts}') && !cfg.timestamp_header) {
			ctx.addIssue({
				code: 'custom',
				path: ['timestamp_header'],
				message: 'timestamp_header is required when template references {ts}'
			})
		}
		if ((cfg.tolerance_seconds ?? 0) > 0 && !cfg.timestamp_header) {
			ctx.addIssue({
				code: 'custom',
				path: ['timestamp_header'],
				message: 'timestamp_header is required when tolerance_seconds > 0'
			})
		}
	})

export const AdminGetAutomationTriggers = createFindParams().extend({
	q: z.string().optional(),
	trigger_type: z.enum(AutomationTriggerType).optional(),
	is_active: z.preprocess(val => {
		if (val === 'true') return true
		if (val === 'false') return false
		return val
	}, z.boolean().optional())
})
export type AdminGetAutomationTriggersType = z.infer<typeof AdminGetAutomationTriggers>

export const AdminCreateAutomationTrigger = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	is_active: z.boolean().optional(),
	trigger_type: z.enum(AutomationTriggerType),
	trigger_events: z.array(z.string()).optional(),
	trigger_signing_key: z.string().optional(),
	signature_config: SignatureConfigSchema.optional(),
	log_incoming: z.boolean().optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
})
export type AdminCreateAutomationTriggerType = z.infer<typeof AdminCreateAutomationTrigger>

export const AdminUpdateAutomationTrigger = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	is_active: z.boolean().optional(),
	trigger_events: z.array(z.string()).optional(),
	trigger_signing_key: z.string().optional(),
	signature_config: SignatureConfigSchema.nullable().optional(),
	log_incoming: z.boolean().optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
})
export type AdminUpdateAutomationTriggerType = z.infer<typeof AdminUpdateAutomationTrigger>

export const AdminGetAutomationReceipts = createFindParams()
export type AdminGetAutomationReceiptsType = z.infer<typeof AdminGetAutomationReceipts>

export const AdminDeleteAutomationTriggers = z.object({
	ids: z.array(z.string()).min(1)
})
export type AdminDeleteAutomationTriggersType = z.infer<typeof AdminDeleteAutomationTriggers>

// ─── Automation Actions ──────────────────────────────────────────────────────

export const AdminGetAutomationActions = createFindParams().extend({
	action_type: z.enum(AutomationActionType).optional(),
	is_active: z.preprocess(val => {
		if (val === 'true') return true
		if (val === 'false') return false
		return val
	}, z.boolean().optional())
})
export type AdminGetAutomationActionsType = z.infer<typeof AdminGetAutomationActions>

export const AdminCreateAutomationAction = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	is_active: z.boolean().optional(),
	action_type: z.enum(AutomationActionType),
	target_url: z.string().url().optional(),
	signing_secret_id: z.string().nullable().optional(),
	request_method: z.enum(AutomationRequestMethod).optional(),
	target_headers: z.array(TargetHeaderSchema).optional(),
	medusa_workflow: z.string().optional(),
	field_mappings: z.array(FieldMappingSchema).optional(),
	static_values: z.array(StaticValueSchema).optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
})
export type AdminCreateAutomationActionType = z.infer<typeof AdminCreateAutomationAction>

export const AdminUpdateAutomationAction = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	is_active: z.boolean().optional(),
	target_url: z.string().url().optional(),
	signing_secret_id: z.string().nullable().optional(),
	request_method: z.enum(AutomationRequestMethod).optional(),
	target_headers: z.array(TargetHeaderSchema).optional(),
	medusa_workflow: z.string().optional(),
	field_mappings: z.array(FieldMappingSchema).optional(),
	static_values: z.array(StaticValueSchema).optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
})
export type AdminUpdateAutomationActionType = z.infer<typeof AdminUpdateAutomationAction>

// ─── Automation Secrets ──────────────────────────────────────────────────────

export const AdminGetAutomationSecrets = createFindParams()
export type AdminGetAutomationSecretsType = z.infer<typeof AdminGetAutomationSecrets>

export const AdminCreateAutomationSecret = z.object({
	label: z.string().min(1)
})
export type AdminCreateAutomationSecretType = z.infer<typeof AdminCreateAutomationSecret>

export const AdminDeleteAutomationActions = z.object({
	ids: z.array(z.string()).min(1)
})
export type AdminDeleteAutomationActionsType = z.infer<typeof AdminDeleteAutomationActions>

// ─── Automation Query ────────────────────────────────────────────────────────

export const AdminUpsertAutomationQuery = z.object({
	entity_name: z.string().min(1),
	fields: z.array(z.string()).optional(),
	filters: z.record(z.string(), z.unknown()).optional(),
	limit: z.coerce.number().int().min(1).optional()
})
export type AdminUpsertAutomationQueryType = z.infer<typeof AdminUpsertAutomationQuery>

// ─── Deliveries ───────────────────────────────────────────────────────────────

import { AutomationDeliveryStatus } from '../modules/automation/models/automation-delivery'

export const AdminGetAutomationDeliveries = createFindParams().extend({
	status: z.enum(AutomationDeliveryStatus).optional(),
	since: z.string().datetime({ offset: true }).optional(),
	until: z.string().datetime({ offset: true }).optional()
})
export type AdminGetAutomationDeliveriesType = z.infer<typeof AdminGetAutomationDeliveries>

export const AdminRetryAutomationDeliveries = z
	.object({
		delivery_ids: z.array(z.string()).min(1).optional(),
		status: z.enum(AutomationDeliveryStatus).optional(),
		since: z.string().datetime({ offset: true }).optional(),
		until: z.string().datetime({ offset: true }).optional()
	})
	.refine(data => data.delivery_ids || data.status || data.since || data.until, {
		error: 'Provide delivery_ids or at least one filter (status, since, until)'
	})
export type AdminRetryAutomationDeliveriesType = z.infer<typeof AdminRetryAutomationDeliveries>
