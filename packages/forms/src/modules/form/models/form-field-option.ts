import { model } from '@medusajs/framework/utils'
import { FormField } from './form-field'

export const FormFieldOption = model.define('form_field_option', {
	id: model.id().primaryKey(),
	label: model.text(),
	value: model.text(),
	sort_order: model.number().default(0),
	form_field: model.belongsTo(() => FormField, { mappedBy: 'field_options' })
})
