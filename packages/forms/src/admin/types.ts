import { PaginatedResponse } from '@medusajs/framework/types'

export type AdminFormFieldOption = {
	id: string
	label: string
	value: string
	sort_order: number
	field_id: string
}

export type AdminFormField = {
	id: string
	name: string
	label: string
	field_type: string
	required: boolean
	sort_order: number
	form_id: string
	field_options?: AdminFormFieldOption[]
	created_at: string
	updated_at: string
}

export type AdminForm = {
	id: string
	name: string
	handle: string
	description?: string | null
	active: boolean
	turnstile_enabled: boolean
	notification_emails?: string[] | null
	metadata?: Record<string, unknown> | null
	form_fields?: AdminFormField[]
	created_at: string
	updated_at: string
}

// Response types
export type AdminFormsResponse = PaginatedResponse<{ forms: AdminForm[] }>
export type AdminFormResponse = { form: AdminForm }
