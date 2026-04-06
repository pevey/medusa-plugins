# medusa-plugin-ses

Notification provider for Medusa for sending email notifications via AWS SES (Simple Email Service).

[Documentation](https://pevey.com/medusa-plugin-ses)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Uses AWS api v3, SESv2Client
- Supports attachments

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-ses
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your medusa-config.js file. Example:

```ts
module.exports = defineConfig({
	//... other config
	modules: [
		{
			resolve: '@medusajs/medusa/notification',
			options: {
				providers: [
					{
						resolve: 'medusa-plugin-ses',
						id: 'ses',
						options: {
							channels: ['email'],
							sesClientConfig: {
								region: process.env.SES_REGION,
								credentials: {
									accessKeyId: process.env.SES_ACCESS_KEY_ID,
									secretAccessKey: process.env.SES_SECRET_ACCESS_KEY
								}
							},
							from: process.env.SES_FROM
						}
					}
				]
			}
		}
		// ... other modules
	]
})
```

## Example Subscriber

```ts
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { inviteUserWorkflow } from '../workflows/notifications/invite-user'

export const config: SubscriberConfig = {
	event: [
		'invite.created'
		// other events
	]
}

type EventPayloadWithId = { id: string }

type EventPayload = EventPayloadWithId | EventPayloadForWhatever | EventPayloadSomethingElse

export default async function emailDispatchHandler({
	event: { data, name },
	container
}: SubscriberArgs<EventPayload>) {
	switch (name) {
		case 'invite.created':
			await inviteUserWorkflow(container).run({
				input: (data as EventPayloadWithId).id
			})
			break
		// ... other events
		default:
			break
	}
}
```

## Example Workflow

You can use whatever templating flow you want to generate the HTML. This example uses React Email.

```ts
import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse
} from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { CreateNotificationDTO } from '@medusajs/framework/types'
import { sendNotificationsStep } from '@medusajs/medusa/core-flows'
import { render, pretty } from '@react-email/render'
import getInviteTemplate from '../../templates/invite-user'
import { getMedusaAdminUrl, getMedusaStorefrontUrl } from '../../utils'

const prepareInviteUserNotificationStep = createStep(
	'prepare-invite-user-notification',
	async (id: string, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)

		const {
			data: [store]
		} = await query.graph({
			entity: 'store',
			fields: ['name']
		})

		const {
			data: [invite]
		} = await query.graph({
			entity: 'invite',
			fields: ['email', 'token'],
			filters: {
				id
			}
		})

		const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
		const adminUrl = getMedusaAdminUrl(config)
		const inviteUrl = `${adminUrl}/invite?token=${invite.token}`

		const html = await pretty(
			await render(
				getInviteTemplate({
					inviteUrl,
					storeName: store.name
				})
			)
		)

		return new StepResponse([
			{
				channel: 'email',
				to: invite.email,
				content: {
					html,
					subject: `You've been invited to join ${store.name}`
				}
			}
		] as CreateNotificationDTO[])
	}
)

export const sendNotificationStep = createStep(
	'send-invite-admin-notification',
	async (notification: CreateNotificationDTO, { container }) => {
		const notificationModule = container.resolve(Modules.NOTIFICATION)
		await notificationModule.createNotifications(notification)
	}
)

export const inviteUserWorkflow = createWorkflow('invite-user-workflow', (id: string) => {
	const notifications = prepareInviteUserNotificationStep(id)
	sendNotificationsStep(notifications)
	return new WorkflowResponse(void 0)
})
```
