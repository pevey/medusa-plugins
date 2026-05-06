import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse
} from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CreateNotificationDTO, RemoteQueryFunction } from '@medusajs/framework/types'
import { sendNotificationsStep } from '@medusajs/medusa/core-flows'
import { render, pretty } from 'react-email'
import getFormSubmissionTemplate from '../../templates/form-submission'

const prepareFormSubmissionNotificationStep = createStep(
	'prepare-form-submission-notification',
	async (id: string, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY) as RemoteQueryFunction

		const {
			data: [store]
		} = await query.graph({
			entity: 'store',
			fields: ['name']
		})

		const {
			data: [submission]
		} = await query.graph({
			entity: 'form_submission',
			fields: [
				'id',
				'data',
				'created_at',
				'form.name',
				'form.notification_emails',
				'form.form_fields.name',
				'form.form_fields.label',
				'form.form_fields.sort_order'
			],
			filters: { id }
		})

		type AnyRecord = Record<string, any>
		const sub = submission as AnyRecord

		const emails: string[] = sub.form?.notification_emails ?? []
		if (emails.length === 0) {
			return new StepResponse([] as CreateNotificationDTO[])
		}

		const formFields: AnyRecord[] = [...(sub.form?.form_fields ?? [])].sort(
			(a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
		)
		const submissionData = (sub.data ?? {}) as Record<string, unknown>

		const fields = formFields.map(f => ({
			label: f.label ?? f.name,
			value: String(submissionData[f.name] ?? '')
		}))

		const html = await pretty(
			await render(
				getFormSubmissionTemplate({
					formName: sub.form?.name ?? 'Form',
					submittedAt: new Date(sub.created_at).toLocaleString(),
					fields,
					storeName: store.name
				})
			)
		)

		const notifications: CreateNotificationDTO[] = emails.map(email => ({
			channel: 'email',
			to: email,
			content: {
				html,
				subject: `New submission: ${sub.form?.name ?? 'Form'}`
			}
		}))

		return new StepResponse(notifications)
	}
)

export const sendFormSubmissionNotificationWorkflow = createWorkflow(
	'send-form-submission-notification',
	function (id: string) {
		const notifications = prepareFormSubmissionNotificationStep(id)
		sendNotificationsStep(notifications)
		return new WorkflowResponse(void 0)
	}
)
