# medusa-plugin-forms

Form builder and submission management plugin for Medusa v2. Create dynamic forms with configurable fields and collect submissions via your Medusa backend with optional Cloudflare Turnstile protection.

[Documentation](https://pevey.com/medusa-plugin-forms)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Create forms with dynamic fields (text, email, tel, number, textarea, select, multiselect, checkbox, date)
- Select/multiselect fields support configurable options
- Public API for form submissions at /forms with optional Cloudflare Turnstile integration for spam protection
- 'form.submitted' event emitter to enable sending notifications on form submission

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-forms
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-forms',
			options: {
				turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
				turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || ''
			}
		}
		// ... other plugins
	]
})
```

The Turnstile keys are optional but highly recommended. If Turnstile validation is enabled for a form and Turnsile keys are not provided, the form submissions will not be accepted.

Example event subscriber for sending emails:

```ts
export const config: SubscriberConfig = {
	event: ['form.submitted']
}

export default async function emailDispatchHandler({
	event: { data, name },
	container
}: SubscriberArgs<EventPayload>) {
	await sendFormSubmissionNotificationWorkflow(container).run({
		input: (data as EventPayloadWithId).id
	})
}
```

Example workflow for sending the notification using a react email template:

```ts
import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse
} from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CreateNotificationDTO } from '@medusajs/framework/types'
import { sendNotificationsStep } from '@medusajs/medusa/core-flows'
import { render, pretty } from '@react-email/render'
import getFormSubmissionTemplate from '../../templates/form-submission'

const prepareFormSubmissionNotificationStep = createStep(
	'prepare-form-submission-notification',
	async (id: string, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)

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
					fields
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
```

## Usage

- Create and manage forms in Settings > Forms in the Medusa admin.
- Add fields and configure options for select/multiselect fields.
- Submit forms via the public store API: `POST /forms/:handle`.
