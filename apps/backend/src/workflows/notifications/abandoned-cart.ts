import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse,
	transform
} from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { ConfigModule, CreateNotificationDTO, RemoteQueryFunction } from '@medusajs/framework/types'
import { sendNotificationsStep, updateCartsStep } from '@medusajs/medusa/core-flows'
import { render, pretty } from 'react-email'
import getAbandonedCartTemplate from '../../templates/abandoned-cart'
import { getMedusaStorefrontUrl } from './utils'

type AbandonedCart = {
	id: string
	email: string
	metadata?: Record<string, unknown> | null
	customer?: { first_name?: string; last_name?: string } | null
	shipping_address?: { first_name?: string; last_name?: string } | null
	items?: Array<{
		title: string
		quantity: number
		unit_price: number
		thumbnail?: string | null
	}>
}

type Input = {
	carts: AbandonedCart[]
}

const prepareAbandonedCartNotificationsStep = createStep(
	'prepare-abandoned-cart-notifications',
	async (input: Input, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY) as RemoteQueryFunction
		const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as ConfigModule
		const storefrontUrl = getMedusaStorefrontUrl(config)

		const {
			data: [store]
		} = await query.graph({
			entity: 'store',
			fields: ['name']
		})

		const notifications: CreateNotificationDTO[] = []

		for (const cart of input.carts) {
			const firstName = cart.customer?.first_name ?? cart.shipping_address?.first_name ?? 'there'

			const recoveryUrl = `${storefrontUrl}/cart/recover/${cart.id}`

			const items = (cart.items ?? []).map(item => ({
				title: item.title,
				quantity: item.quantity,
				unit_price: item.unit_price,
				thumbnail: item.thumbnail ?? undefined
			}))

			const html = await pretty(
				await render(
					getAbandonedCartTemplate({
						customer_first_name: firstName,
						recovery_url: recoveryUrl,
						items,
						storeName: store.name
					})
				)
			)

			notifications.push({
				channel: 'email',
				to: cart.email,
				content: {
					html,
					subject: `${firstName}, your cart is waiting for you`
				}
			})
		}

		return new StepResponse(notifications)
	}
)

export const sendAbandonedCartsWorkflow = createWorkflow('send-abandoned-carts', (input: Input) => {
	const notifications = prepareAbandonedCartNotificationsStep(input)
	sendNotificationsStep(notifications)

	const updateData = transform(input, data =>
		data.carts.map(cart => ({
			id: cart.id,
			metadata: {
				...(cart.metadata ?? {}),
				abandoned_notification: new Date().toISOString()
			}
		}))
	)

	updateCartsStep(updateData)

	return new WorkflowResponse(void 0)
})
