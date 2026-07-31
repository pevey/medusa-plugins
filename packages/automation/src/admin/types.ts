export type TriggerType = 'medusa_event' | 'incoming_webhook'
export type ActionType = 'outgoing_webhook' | 'outgoing_request' | 'medusa_workflow'
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type FieldMapping = { source_path: string; target_key: string }
export type StaticValue = { key: string; value: string }

export type SignatureConfig = {
	header?: string
	encoding?: 'hex' | 'base64'
	prefix?: string
	template?: string
	timestamp_header?: string
	tolerance_seconds?: number
}

export type AutomationTrigger = {
	id: string
	name: string
	description: string | null
	trigger_type: TriggerType
	is_active: boolean
	trigger_events: string[] | null
	/** True when a signing key is set. The key value itself is never returned. */
	has_signing_key: boolean
	signature_config: SignatureConfig | null
	log_incoming: boolean
	metadata: Record<string, unknown> | null
	created_at: string
	updated_at: string
}

export type AutomationAction = {
	id: string
	trigger_id: string
	name: string
	description: string | null
	action_type: ActionType
	is_active: boolean
	target_url: string | null
	request_method: string | null
	target_headers: Array<{ key: string; value: string }> | null
	signing_secret_id: string | null
	medusa_workflow: string | null
	field_mappings: FieldMapping[] | null
	static_values: StaticValue[] | null
	metadata: Record<string, unknown> | null
	created_at: string
	updated_at: string
}

export type AutomationDelivery = {
	id: string
	action_id: string
	event_name: string
	request_payload: Record<string, unknown> | null
	response_status: number | null
	response_body: string | null
	status: 'pending' | 'success' | 'failed'
	attempts: number
	error_message: string | null
	created_at: string
	updated_at: string
}

export type AutomationReceipt = {
	id: string
	trigger_id: string
	request_ip: string | null
	payload: unknown
	created_at: string
	updated_at: string
}

export type AutomationSecret = {
	id: string
	label: string
	created_at: string
	updated_at: string
}

export type CreatedSecret = {
	id: string
	label: string
	secret: string
	created_at: string
}

export type AutomationQueryConfig = {
	id: string
	action_id: string
	entity_name: string
	fields: string[] | null
	filters: Record<string, unknown> | null
	limit: number
	created_at: string
	updated_at: string
}

export type TriggersResponse = {
	triggers: AutomationTrigger[]
	count: number
	limit: number
	offset: number
}

export type TriggerResponse = {
	trigger: AutomationTrigger
}

export type ActionsResponse = {
	actions: AutomationAction[]
	count: number
	limit: number
	offset: number
}

export type ActionResponse = {
	action: AutomationAction
}

export type DeliveriesResponse = {
	deliveries: AutomationDelivery[]
	count: number
	limit: number
	offset: number
}

export type ReceiptsResponse = {
	receipts: AutomationReceipt[]
	count: number
	limit: number
	offset: number
}

export type AutomationQueryResponse = {
	query: AutomationQueryConfig | null
}

export type RetryDeliveriesResponse = {
	retried: number
	succeeded: number
	failed: number
}

export type DeleteResponse = {
	deleted: string[]
}

/** DELETE /admin/automations/:id/actions/:actionId/query — a single boolean flag, not a
 *  list of deleted ids like the other delete routes (there is at most one query config
 *  per action, and it's a no-op if none exists). */
export type DeleteQueryResponse = {
	deleted: boolean
}

export type SecretsListResponse = {
	secrets: AutomationSecret[]
	count: number
}

export type CreateSecretResponse = {
	secret: CreatedSecret
}
