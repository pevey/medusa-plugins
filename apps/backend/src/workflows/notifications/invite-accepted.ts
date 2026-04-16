import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse
} from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CreateNotificationDTO, RemoteQueryFunction } from '@medusajs/framework/types'
import { sendNotificationsStep } from '@medusajs/medusa/core-flows'
import { render, pretty } from '@react-email/render'
import getInviteAcceptedTemplate from '../../templates/invite-accepted'

const prepareInviteAcceptedNotificationStep = createStep(
	'prepare-invite-accepted-notification',
	async (id: string, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY) as RemoteQueryFunction

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
			fields: ['email'],
			filters: { id }
		})

		if (!invite?.email) {
			return new StepResponse([] as CreateNotificationDTO[])
		}

		const html = await pretty(
			await render(
				getInviteAcceptedTemplate({
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
					subject: `Welcome to ${store.name}!`
				}
			}
		] as CreateNotificationDTO[])
	}
)

export const inviteAcceptedWorkflow = createWorkflow(
	'invite-accepted-workflow',
	(id: string) => {
		const notifications = prepareInviteAcceptedNotificationStep(id)
		sendNotificationsStep(notifications)
		return new WorkflowResponse(void 0)
	}
)
