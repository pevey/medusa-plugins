import { model } from '@medusajs/framework/utils'
import { FormField } from './form-field'
import { FormSubmission } from './form-submission'

export const Form = model
	.define('form', {
		id: model.id().primaryKey(),
		name: model.text(),
		handle: model.text().unique(),
		description: model.text().nullable(),
		active: model.boolean().default(true),
		turnstile_enabled: model.boolean().default(true),
		notification_emails: model.json().nullable(),
		metadata: model.json().nullable(),
		form_fields: model.hasMany(() => FormField, { mappedBy: 'form' }),
		submissions: model.hasMany(() => FormSubmission, { mappedBy: 'form' })
	})
	.cascades({
		delete: ['form_fields', 'submissions']
	})
