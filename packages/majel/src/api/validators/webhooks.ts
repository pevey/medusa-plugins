import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'
import { WebhookTriggerType } from '../../modules/webhook/models/webhook-trigger'
import { WebhookDeliveryStatus } from '../../modules/webhook/models/webhook-delivery'
import {
	WebhookActionType,
	WebhookRequestMethod
} from '../../modules/webhook/models/webhook-action'

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

// ─── Webhook Triggers ─────────────────────────────────────────────────────────

export const AdminGetWebhookTriggers = createFindParams().extend({
	q: z.string().optional(),
	trigger_type: z.nativeEnum(WebhookTriggerType).optional(),
	is_active: z.preprocess(val => {
		if (val === 'true') return true
		if (val === 'false') return false
		return val
	}, z.boolean().optional())
})
export type AdminGetWebhookTriggersType = z.infer<typeof AdminGetWebhookTriggers>

export const AdminGetWebhookTrigger = createFindParams()
export type AdminGetWebhookTriggerType = z.infer<typeof AdminGetWebhookTrigger>

export const AdminCreateWebhookTrigger = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	is_active: z.boolean().optional(),
	trigger_type: z.nativeEnum(WebhookTriggerType),
	trigger_events: z.array(z.string()).optional(),
	trigger_signing_key: z.string().optional(),
	log_incoming: z.boolean().optional(),
	metadata: z.record(z.unknown()).optional()
})
export type AdminCreateWebhookTriggerType = z.infer<typeof AdminCreateWebhookTrigger>

export const AdminUpdateWebhookTrigger = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	is_active: z.boolean().optional(),
	trigger_events: z.array(z.string()).optional(),
	trigger_signing_key: z.string().optional(),
	log_incoming: z.boolean().optional(),
	metadata: z.record(z.unknown()).optional()
})
export type AdminUpdateWebhookTriggerType = z.infer<typeof AdminUpdateWebhookTrigger>

export const AdminGetWebhookReceipts = createFindParams()
export type AdminGetWebhookReceiptsType = z.infer<typeof AdminGetWebhookReceipts>

export const AdminDeleteWebhookTriggers = z.object({
	ids: z.array(z.string()).min(1)
})
export type AdminDeleteWebhookTriggersType = z.infer<typeof AdminDeleteWebhookTriggers>

// ─── Webhook Actions ──────────────────────────────────────────────────────────

export const AdminGetWebhookActions = createFindParams().extend({
	action_type: z.nativeEnum(WebhookActionType).optional(),
	is_active: z.preprocess(val => {
		if (val === 'true') return true
		if (val === 'false') return false
		return val
	}, z.boolean().optional())
})
export type AdminGetWebhookActionsType = z.infer<typeof AdminGetWebhookActions>

export const AdminGetWebhookAction = createFindParams()
export type AdminGetWebhookActionType = z.infer<typeof AdminGetWebhookAction>

export const AdminCreateWebhookAction = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	is_active: z.boolean().optional(),
	action_type: z.nativeEnum(WebhookActionType),
	target_url: z.string().optional(),
	signing_secret_id: z.string().nullable().optional(),
	request_method: z.nativeEnum(WebhookRequestMethod).optional(),
	target_headers: z.array(TargetHeaderSchema).optional(),
	medusa_workflow: z.string().optional(),
	field_mappings: z.array(FieldMappingSchema).optional(),
	static_values: z.array(StaticValueSchema).optional(),
	metadata: z.record(z.unknown()).optional()
})
export type AdminCreateWebhookActionType = z.infer<typeof AdminCreateWebhookAction>

export const AdminUpdateWebhookAction = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	is_active: z.boolean().optional(),
	target_url: z.string().optional(),
	signing_secret_id: z.string().nullable().optional(),
	request_method: z.nativeEnum(WebhookRequestMethod).optional(),
	target_headers: z.array(TargetHeaderSchema).optional(),
	medusa_workflow: z.string().optional(),
	field_mappings: z.array(FieldMappingSchema).optional(),
	static_values: z.array(StaticValueSchema).optional(),
	metadata: z.record(z.unknown()).optional()
})
export type AdminUpdateWebhookActionType = z.infer<typeof AdminUpdateWebhookAction>

// ─── Webhook Secrets ──────────────────────────────────────────────────────────

export const AdminGetWebhookSecrets = createFindParams()
export type AdminGetWebhookSecretsType = z.infer<typeof AdminGetWebhookSecrets>

export const AdminCreateWebhookSecret = z.object({
	label: z.string().min(1)
})
export type AdminCreateWebhookSecretType = z.infer<typeof AdminCreateWebhookSecret>

export const AdminDeleteWebhookActions = z.object({
	ids: z.array(z.string()).min(1)
})
export type AdminDeleteWebhookActionsType = z.infer<typeof AdminDeleteWebhookActions>

// ─── Webhook Query ────────────────────────────────────────────────────────────

export const AdminUpsertWebhookQuery = z.object({
	entity_name: z.string().min(1),
	fields: z.array(z.string()).optional(),
	filters: z.record(z.unknown()).optional(),
	limit: z.coerce.number().int().min(1).optional()
})
export type AdminUpsertWebhookQueryType = z.infer<typeof AdminUpsertWebhookQuery>

// ─── Deliveries ───────────────────────────────────────────────────────────────

export const AdminGetWebhookDeliveries = createFindParams().extend({
	status: z.nativeEnum(WebhookDeliveryStatus).optional()
})
export type AdminGetWebhookDeliveriesType = z.infer<typeof AdminGetWebhookDeliveries>
