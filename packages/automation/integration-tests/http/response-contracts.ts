/**
 * Response contracts for the automation admin API.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the hand-written
 * admin view types in `../../src/admin/types`. Nothing previously verified those
 * hand-written types actually matched what the routes return -- the admin dashboard
 * is bundled by Vite and never typechecked against a real HTTP response, and the
 * test harness fakes the SDK, so it only ever sees fixtures a test author wrote.
 * This module plus the `.parse()` calls in `automations.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-automation typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in automations.spec.ts. A route that
 *                           stops returning a field, or starts returning an extra
 *                           one, fails the parse -- `z.strictObject` rejects unknown
 *                           keys, so both directions are caught, not just missing ones.
 *   3. type <-> components  tsc, via the admin dashboard's own typecheck (not part of
 *                           this file -- automation has no tsconfig.admin.json yet).
 *
 * A route changing shape fails link 2; "fixing" the schema to match would silently
 * break link 3 for every component reading the removed/changed field, so schema
 * drift is a finding about the TYPE (and by extension the components that read it),
 * never a reason to loosen the schema. See task-4c-automation-report.md for every
 * mismatch found while building this file and which side was fixed.
 *
 * This plugin's routes call the module service's generated `list*`/`listAndCount*`/
 * `create*`/`update*` methods directly -- there is no `query.graph()` field selection
 * anywhere, so every response is (or, before this task, was) the raw MikroORM entity.
 * That raw shape leaked internal columns no admin type declared: `deleted_at` on every
 * entity, and inconsistent belongsTo/hasOne/hasMany relation stubs that differed
 * between the create route and the list/get/update routes for the same entity
 * (`actions`/`receipts: []` and `deliveries: []` only on create; `trigger`/`action`/
 * `query` stub objects only on list/get/update). None of these are read by any admin
 * component (confirmed by grep across `src/admin`). Rather than encode that
 * inconsistency into the schemas, the routes were fixed to strip it uniformly --
 * see task-4c-automation-report.md for the full list of route edits. The scalar FK
 * columns (`trigger_id` on AutomationAction/AutomationReceipt, `action_id` on
 * AutomationDelivery/AutomationQueryConfig) are genuinely present on every route for
 * that entity, so those were kept and added to the admin types instead of stripped.
 */
import { z } from '@medusajs/framework/zod'
import type {
	ActionResponse,
	ActionsResponse,
	AutomationAction,
	AutomationDelivery,
	AutomationQueryConfig,
	AutomationQueryResponse,
	AutomationReceipt,
	AutomationSecret,
	AutomationTrigger,
	CreatedSecret,
	CreateSecretResponse,
	DeleteQueryResponse,
	DeleteResponse,
	DeliveriesResponse,
	ReceiptsResponse,
	RetryDeliveriesResponse,
	SecretsListResponse,
	TriggerResponse,
	TriggersResponse
} from '../../src/admin/types'

// ── Shared value schemas (embedded JSON blobs, not entities) ───────────────────

const FieldMappingSchema = z.strictObject({
	source_path: z.string(),
	target_key: z.string()
})

const TargetHeaderSchema = z.strictObject({
	key: z.string(),
	value: z.string()
})

const StaticValueSchema = z.strictObject({
	key: z.string(),
	value: z.string()
})

const SignatureConfigSchema = z.strictObject({
	header: z.string().optional(),
	encoding: z.enum(['hex', 'base64']).optional(),
	prefix: z.string().optional(),
	template: z.string().optional(),
	timestamp_header: z.string().optional(),
	tolerance_seconds: z.number().optional()
})

// ── Triggers ─────────────────────────────────────────────────────────────────

export const AutomationTriggerSchema = z.strictObject({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	trigger_type: z.enum(['medusa_event', 'incoming_webhook']),
	is_active: z.boolean(),
	trigger_events: z.array(z.string()).nullable(),
	has_signing_key: z.boolean(),
	signature_config: SignatureConfigSchema.nullable(),
	log_incoming: z.boolean(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	created_at: z.string(),
	updated_at: z.string()
})
const _triggerSchemaMatchesType: AutomationTrigger = {} as z.infer<typeof AutomationTriggerSchema>
const _triggerTypeMatchesSchema: z.infer<typeof AutomationTriggerSchema> = {} as AutomationTrigger

export const TriggerResponseSchema = z.strictObject({
	trigger: AutomationTriggerSchema
})
const _triggerResponseSchemaMatchesType: TriggerResponse = {} as z.infer<typeof TriggerResponseSchema>
const _triggerResponseTypeMatchesSchema: z.infer<typeof TriggerResponseSchema> = {} as TriggerResponse

export const TriggersResponseSchema = z.strictObject({
	triggers: z.array(AutomationTriggerSchema),
	count: z.number(),
	limit: z.number(),
	offset: z.number()
})
const _triggersResponseSchemaMatchesType: TriggersResponse = {} as z.infer<typeof TriggersResponseSchema>
const _triggersResponseTypeMatchesSchema: z.infer<typeof TriggersResponseSchema> = {} as TriggersResponse

// ── Actions ──────────────────────────────────────────────────────────────────

export const AutomationActionSchema = z.strictObject({
	id: z.string(),
	trigger_id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	action_type: z.enum(['outgoing_webhook', 'outgoing_request', 'medusa_workflow']),
	is_active: z.boolean(),
	target_url: z.string().nullable(),
	request_method: z.string().nullable(),
	target_headers: z.array(TargetHeaderSchema).nullable(),
	signing_secret_id: z.string().nullable(),
	medusa_workflow: z.string().nullable(),
	field_mappings: z.array(FieldMappingSchema).nullable(),
	static_values: z.array(StaticValueSchema).nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	created_at: z.string(),
	updated_at: z.string()
})
const _actionSchemaMatchesType: AutomationAction = {} as z.infer<typeof AutomationActionSchema>
const _actionTypeMatchesSchema: z.infer<typeof AutomationActionSchema> = {} as AutomationAction

export const ActionResponseSchema = z.strictObject({
	action: AutomationActionSchema
})
const _actionResponseSchemaMatchesType: ActionResponse = {} as z.infer<typeof ActionResponseSchema>
const _actionResponseTypeMatchesSchema: z.infer<typeof ActionResponseSchema> = {} as ActionResponse

export const ActionsResponseSchema = z.strictObject({
	actions: z.array(AutomationActionSchema),
	count: z.number(),
	limit: z.number(),
	offset: z.number()
})
const _actionsResponseSchemaMatchesType: ActionsResponse = {} as z.infer<typeof ActionsResponseSchema>
const _actionsResponseTypeMatchesSchema: z.infer<typeof ActionsResponseSchema> = {} as ActionsResponse

// ── Deliveries ───────────────────────────────────────────────────────────────

export const AutomationDeliverySchema = z.strictObject({
	id: z.string(),
	action_id: z.string(),
	event_name: z.string(),
	request_payload: z.record(z.string(), z.unknown()).nullable(),
	response_status: z.number().nullable(),
	response_body: z.string().nullable(),
	status: z.enum(['pending', 'success', 'failed']),
	attempts: z.number(),
	error_message: z.string().nullable(),
	created_at: z.string(),
	updated_at: z.string()
})
const _deliverySchemaMatchesType: AutomationDelivery = {} as z.infer<typeof AutomationDeliverySchema>
const _deliveryTypeMatchesSchema: z.infer<typeof AutomationDeliverySchema> = {} as AutomationDelivery

export const DeliveriesResponseSchema = z.strictObject({
	deliveries: z.array(AutomationDeliverySchema),
	count: z.number(),
	limit: z.number(),
	offset: z.number()
})
const _deliveriesResponseSchemaMatchesType: DeliveriesResponse = {} as z.infer<typeof DeliveriesResponseSchema>
const _deliveriesResponseTypeMatchesSchema: z.infer<typeof DeliveriesResponseSchema> = {} as DeliveriesResponse

export const RetryDeliveriesResponseSchema = z.strictObject({
	retried: z.number(),
	succeeded: z.number(),
	failed: z.number()
})
const _retryResponseSchemaMatchesType: RetryDeliveriesResponse = {} as z.infer<typeof RetryDeliveriesResponseSchema>
const _retryResponseTypeMatchesSchema: z.infer<typeof RetryDeliveriesResponseSchema> = {} as RetryDeliveriesResponse

// ── Receipts ─────────────────────────────────────────────────────────────────

export const AutomationReceiptSchema = z.strictObject({
	id: z.string(),
	trigger_id: z.string(),
	request_ip: z.string().nullable(),
	payload: z.unknown(),
	created_at: z.string(),
	updated_at: z.string()
})
const _receiptSchemaMatchesType: AutomationReceipt = {} as z.infer<typeof AutomationReceiptSchema>
const _receiptTypeMatchesSchema: z.infer<typeof AutomationReceiptSchema> = {} as AutomationReceipt

export const ReceiptsResponseSchema = z.strictObject({
	receipts: z.array(AutomationReceiptSchema),
	count: z.number(),
	limit: z.number(),
	offset: z.number()
})
const _receiptsResponseSchemaMatchesType: ReceiptsResponse = {} as z.infer<typeof ReceiptsResponseSchema>
const _receiptsResponseTypeMatchesSchema: z.infer<typeof ReceiptsResponseSchema> = {} as ReceiptsResponse

// ── Action query config ──────────────────────────────────────────────────────

export const AutomationQueryConfigSchema = z.strictObject({
	id: z.string(),
	action_id: z.string(),
	entity_name: z.string(),
	fields: z.array(z.string()).nullable(),
	filters: z.record(z.string(), z.unknown()).nullable(),
	limit: z.number(),
	created_at: z.string(),
	updated_at: z.string()
})
const _queryConfigSchemaMatchesType: AutomationQueryConfig = {} as z.infer<typeof AutomationQueryConfigSchema>
const _queryConfigTypeMatchesSchema: z.infer<typeof AutomationQueryConfigSchema> = {} as AutomationQueryConfig

export const AutomationQueryResponseSchema = z.strictObject({
	query: AutomationQueryConfigSchema.nullable()
})
const _queryResponseSchemaMatchesType: AutomationQueryResponse = {} as z.infer<typeof AutomationQueryResponseSchema>
const _queryResponseTypeMatchesSchema: z.infer<typeof AutomationQueryResponseSchema> = {} as AutomationQueryResponse

export const DeleteQueryResponseSchema = z.strictObject({
	deleted: z.boolean()
})
const _deleteQueryResponseSchemaMatchesType: DeleteQueryResponse = {} as z.infer<typeof DeleteQueryResponseSchema>
const _deleteQueryResponseTypeMatchesSchema: z.infer<typeof DeleteQueryResponseSchema> = {} as DeleteQueryResponse

// ── Secrets ──────────────────────────────────────────────────────────────────
//
// SECURITY-SENSITIVE: `AutomationSecretSchema` intentionally has no `secret` field.
// The list route (GET /admin/automations/secrets) must never return the plaintext
// or encrypted secret value, only `id`/`label`/timestamps -- `z.strictObject` means
// a route that started leaking `secret` on the list endpoint would fail this parse.

export const AutomationSecretSchema = z.strictObject({
	id: z.string(),
	label: z.string(),
	created_at: z.string(),
	updated_at: z.string()
})
const _secretSchemaMatchesType: AutomationSecret = {} as z.infer<typeof AutomationSecretSchema>
const _secretTypeMatchesSchema: z.infer<typeof AutomationSecretSchema> = {} as AutomationSecret

export const SecretsListResponseSchema = z.strictObject({
	secrets: z.array(AutomationSecretSchema),
	count: z.number()
})
const _secretsListResponseSchemaMatchesType: SecretsListResponse = {} as z.infer<typeof SecretsListResponseSchema>
const _secretsListResponseTypeMatchesSchema: z.infer<typeof SecretsListResponseSchema> = {} as SecretsListResponse

// `CreatedSecret` is the one and only place the plaintext secret value is ever returned --
// exactly once, at creation time.
export const CreatedSecretSchema = z.strictObject({
	id: z.string(),
	label: z.string(),
	secret: z.string(),
	created_at: z.string()
})
const _createdSecretSchemaMatchesType: CreatedSecret = {} as z.infer<typeof CreatedSecretSchema>
const _createdSecretTypeMatchesSchema: z.infer<typeof CreatedSecretSchema> = {} as CreatedSecret

export const CreateSecretResponseSchema = z.strictObject({
	secret: CreatedSecretSchema
})
const _createSecretResponseSchemaMatchesType: CreateSecretResponse = {} as z.infer<typeof CreateSecretResponseSchema>
const _createSecretResponseTypeMatchesSchema: z.infer<typeof CreateSecretResponseSchema> = {} as CreateSecretResponse

// ── Delete responses ─────────────────────────────────────────────────────────

export const DeleteResponseSchema = z.strictObject({
	deleted: z.array(z.string())
})
const _deleteResponseSchemaMatchesType: DeleteResponse = {} as z.infer<typeof DeleteResponseSchema>
const _deleteResponseTypeMatchesSchema: z.infer<typeof DeleteResponseSchema> = {} as DeleteResponse
