import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse
} from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { ConfigModule, CreateNotificationDTO, INotificationModuleService, RemoteQueryFunction } from '@medusajs/framework/types'
import { sendNotificationsStep } from '@medusajs/medusa/core-flows'
import { render, pretty } from '@react-email/render'
import getInviteTemplate from '../../templates/invite-sent'
import { getMedusaAdminUrl, getMedusaStorefrontUrl } from './utils'

const prepareInviteUserNotificationStep = createStep(
	'prepare-invite-user-notification',
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
			fields: ['email', 'token'],
			filters: {
				id
			}
		})

		const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as ConfigModule
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
		const notificationModule = container.resolve(Modules.NOTIFICATION) as INotificationModuleService
		await notificationModule.createNotifications(notification)
	}
)

export const inviteUserWorkflow = createWorkflow('invite-user-workflow', (id: string) => {
	const notifications = prepareInviteUserNotificationStep(id)
	sendNotificationsStep(notifications)
	return new WorkflowResponse(void 0)
})
