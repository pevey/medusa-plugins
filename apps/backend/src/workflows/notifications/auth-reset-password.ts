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
import getResetPasswordTemplate from '../../templates/reset-password'
import { getMedusaAdminUrl, getMedusaStorefrontUrl } from './utils'

const prepareAuthResetPasswordNotificationStep = createStep(
	'prepare-auth-reset-password-notification',
	async (
		{
			entity_id: email,
			token,
			actor_type
		}: { entity_id: string; token: string; actor_type: string },
		{ container }
	) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY) as RemoteQueryFunction
		const {
			data: [store]
		} = await query.graph({
			entity: 'store',
			fields: ['name']
		})

		const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as ConfigModule
		let urlBase =
			actor_type === 'customer' ? getMedusaStorefrontUrl(config) : getMedusaAdminUrl(config)
		const resetPasswordUrl = `${urlBase}/reset-password?token=${token}&email=${email}`

		const html = await pretty(
			await render(
				getResetPasswordTemplate({
					resetPasswordUrl,
					storeName: store.name
				})
			)
		)

		return new StepResponse<CreateNotificationDTO[]>([
			{
				channel: 'email',
				to: email,
				content: {
					html,
					subject: `Reset your password - ${store.name}`
				}
			}
		])
	}
)

export const sendNotificationStep = createStep(
	{
		name: 'send-notification',
		maxRetries: 2,
		retryInterval: 300 // wait 5 min between retries
	},
	async (data: CreateNotificationDTO[], { container }) => {
		const notificationModuleService = container.resolve(Modules.NOTIFICATION) as INotificationModuleService
		const notification = await notificationModuleService.createNotifications(data)
		return new StepResponse(notification)
	}
)

export const sendAuthResetPasswordNotificationWorkflow = createWorkflow(
	'send-auth-reset-password-notification',
	(input: { entity_id: string; token: string; actor_type: string }) => {
		const notifications = prepareAuthResetPasswordNotificationStep(input)
		sendNotificationsStep(notifications)
		return new WorkflowResponse(void 0)
	}
)
