import { model } from '@medusajs/framework/utils'
import { Form } from './form'

export enum SubmissionStatus {
	NEW = 'new',
	READ = 'read',
	ARCHIVED = 'archived'
}

export const FormSubmission = model.define('form_submission', {
	id: model.id().primaryKey(),
	data: model.json(),
	ip_address: model.text().nullable(),
	user_agent: model.text().nullable(),
	status: model.enum(SubmissionStatus).default(SubmissionStatus.NEW),
	form: model.belongsTo(() => Form, { mappedBy: 'submissions' })
})
