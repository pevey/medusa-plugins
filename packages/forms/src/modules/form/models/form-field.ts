import { model } from '@medusajs/framework/utils'
import { Form } from './form'
import { FormFieldOption } from './form-field-option'

export const FormField = model
	.define('form_field', {
		id: model.id().primaryKey(),
		name: model.text(),
		label: model.text(),
		field_type: model.text(),
		required: model.boolean().default(false),
		sort_order: model.number().default(0),
		form: model.belongsTo(() => Form, { mappedBy: 'form_fields' }),
		field_options: model.hasMany(() => FormFieldOption, { mappedBy: 'form_field' })
	})
	.cascades({
		delete: ['field_options']
	})
