// Source: packages/forms/src/api/validators.ts
// Routes: POST /forms/:handle

export interface FormSubmitInput {
	cf_turnstile_response?: string
	data: Record<string, unknown>
}

export interface FormSubmitResponse {
	submitted: boolean
}
