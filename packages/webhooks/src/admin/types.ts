export type TriggerType = 'medusa_event' | 'incoming_webhook'
export type ActionType = 'outgoing_webhook' | 'outgoing_request' | 'medusa_workflow'
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type FieldMapping = { source_path: string; target_key: string }
export type StaticValue = { key: string; value: string }

export type WebhookTrigger = {
	id: string
	name: string
	description?: string
	trigger_type: TriggerType
	is_active: boolean
	trigger_events?: string[]
	trigger_signing_key?: string
	log_incoming?: boolean
	metadata?: Record<string, unknown>
	created_at: string
	updated_at: string
}

export type WebhookAction = {
	id: string
	name: string
	description?: string
	action_type: ActionType
	is_active: boolean
	target_url?: string
	request_method?: string | null
	target_headers?: Array<{ key: string; value: string }>
	signing_secret_id?: string | null
	medusa_workflow?: string
	field_mappings?: FieldMapping[]
	static_values?: StaticValue[]
	metadata?: Record<string, unknown>
	created_at: string
	updated_at: string
}

export type WebhookDelivery = {
	id: string
	event_name: string
	status: 'pending' | 'success' | 'failed'
	attempts: number
	response_status?: number
	error_message?: string
	created_at: string
}

export type WebhookReceipt = {
	id: string
	request_ip?: string
	payload: unknown
	created_at: string
}

export type WebhookSecret = {
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

export type TriggersResponse = {
	triggers: WebhookTrigger[]
	count: number
	limit: number
	offset: number
}

export type ActionsResponse = {
	actions: WebhookAction[]
	count: number
	limit: number
	offset: number
}

export type SecretsListResponse = {
	secrets: WebhookSecret[]
	count: number
}

export type CreateSecretResponse = {
	secret: CreatedSecret
}
