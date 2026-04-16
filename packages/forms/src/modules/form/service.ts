import { MedusaService } from '@medusajs/framework/utils'
import { Form } from './models/form'
import { FormField } from './models/form-field'
import { FormFieldOption } from './models/form-field-option'
import { FormSubmission } from './models/form-submission'
import { FormModuleOptions } from './types'

export class FormService extends MedusaService({
	Form,
	FormField,
	FormFieldOption,
	FormSubmission
}) {
	protected readonly options_: FormModuleOptions

	constructor(_container: object, options: FormModuleOptions = {}) {
		super(...arguments)
		this.options_ = options
	}

	getOptions(): FormModuleOptions {
		return this.options_
	}
}
