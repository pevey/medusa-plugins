import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

const handleSchema = z
	.string()
	.regex(
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		'Handle must use only lowercase letters, numbers, and hyphens'
	)

const fieldInputSchema = z.object({
	name: z.string(),
	label: z.string(),
	field_type: z.string(),
	required: z.boolean().optional(),
	sort_order: z.number().int().optional()
})

// ── Forms ──────────────────────────────────────────────────────────────────────

export const AdminGetForms = createFindParams({ limit: 15, offset: 0 }).extend({
	q: z.string().optional(),
	active: z.boolean().optional()
})
export type AdminGetFormsType = z.infer<typeof AdminGetForms>

export const AdminGetForm = createFindParams()
export type AdminGetFormType = z.infer<typeof AdminGetForm>

export const AdminCreateForm = z.object({
	name: z.string(),
	handle: handleSchema,
	description: z.string().nullable().optional(),
	active: z.boolean().optional(),
	turnstile_enabled: z.boolean().optional(),
	notification_emails: z.array(z.email()).nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	form_fields: z.array(fieldInputSchema).optional()
})
export type AdminCreateFormType = z.infer<typeof AdminCreateForm>

export const AdminUpdateForm = z.object({
	name: z.string().optional(),
	handle: handleSchema.optional(),
	description: z.string().nullable().optional(),
	active: z.boolean().optional(),
	turnstile_enabled: z.boolean().optional(),
	notification_emails: z.array(z.email()).nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	form_fields: z
		.array(
			z.object({
				id: z.string().optional(),
				name: z.string(),
				label: z.string(),
				field_type: z.string(),
				required: z.boolean().optional(),
				sort_order: z.number().int().optional()
			})
		)
		.optional()
})
export type AdminUpdateFormType = z.infer<typeof AdminUpdateForm>

export const AdminDeleteForms = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteFormsType = z.infer<typeof AdminDeleteForms>

// ── Form Fields ────────────────────────────────────────────────────────────────

export const AdminGetFormFields = createFindParams({ limit: 50, offset: 0 })
export type AdminGetFormFieldsType = z.infer<typeof AdminGetFormFields>

export const AdminCreateFormField = fieldInputSchema
export type AdminCreateFormFieldType = z.infer<typeof AdminCreateFormField>

export const AdminUpdateFormField = z.object({
	name: z.string().optional(),
	label: z.string().optional(),
	field_type: z.string().optional(),
	required: z.boolean().optional(),
	sort_order: z.number().int().optional(),
	field_options: z
		.array(
			z.object({
				id: z.string().optional(),
				label: z.string(),
				value: z.string(),
				sort_order: z.number().int().optional()
			})
		)
		.optional()
})
export type AdminUpdateFormFieldType = z.infer<typeof AdminUpdateFormField>

export const AdminDeleteFormFields = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteFormFieldsType = z.infer<typeof AdminDeleteFormFields>

// ── Form Submissions ───────────────────────────────────────────────────────────

export const AdminGetFormSubmissions = createFindParams({ limit: 20, offset: 0 }).extend({
	form_id: z.string().optional(),
	status: z.enum(['new', 'read', 'archived']).optional()
})
export type AdminGetFormSubmissionsType = z.infer<typeof AdminGetFormSubmissions>

export const AdminGetFormSubmission = createFindParams()
export type AdminGetFormSubmissionType = z.infer<typeof AdminGetFormSubmission>

export const AdminUpdateFormSubmission = z.object({
	status: z.enum(['new', 'read', 'archived'])
})
export type AdminUpdateFormSubmissionType = z.infer<typeof AdminUpdateFormSubmission>

export const AdminDeleteFormSubmissions = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteFormSubmissionsType = z.infer<typeof AdminDeleteFormSubmissions>

// ── Form Field Options ─────────────────────────────────────────────────────────

export const AdminCreateFormFieldOption = z.object({
	label: z.string(),
	value: z.string(),
	sort_order: z.number().int().optional()
})
export type AdminCreateFormFieldOptionType = z.infer<typeof AdminCreateFormFieldOption>

export const AdminUpdateFormFieldOption = z.object({
	label: z.string().optional(),
	value: z.string().optional(),
	sort_order: z.number().int().optional()
})
export type AdminUpdateFormFieldOptionType = z.infer<typeof AdminUpdateFormFieldOption>

export const AdminDeleteFormFieldOptions = z.object({
	ids: z.array(z.string()).min(1, 'At least one ID is required')
})
export type AdminDeleteFormFieldOptionsType = z.infer<typeof AdminDeleteFormFieldOptions>

// ── Store ─────────────────────────────────────────────────────────────────────

export const StoreSubmitForm = z.object({
	token: z.string().optional(),
	data: z.record(z.string(), z.unknown())
})
export type StoreSubmitFormType = z.infer<typeof StoreSubmitForm>
