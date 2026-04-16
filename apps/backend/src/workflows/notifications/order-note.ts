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
import { ORDER_NOTE_MODULE } from 'medusa-plugin-order-notes'
import { OrderNoteService } from 'medusa-plugin-order-notes'
import getOrderNoteTemplate from '../../templates/order-note'

const prepareOrderNoteNotificationStep = createStep(
	'prepare-order-note-notification',
	async (id: string, { container }) => {
		const orderNoteService: OrderNoteService = container.resolve(ORDER_NOTE_MODULE)
		const query = container.resolve(ContainerRegistrationKeys.QUERY) as RemoteQueryFunction

		const {
			data: [store]
		} = await query.graph({
			entity: 'store',
			fields: ['name']
		})

		const [orderNote] = await orderNoteService.listOrderNotes({ id })

		if (!orderNote || !orderNote.sent) {
			return new StepResponse([] as CreateNotificationDTO[])
		}

		const {
			data: [order]
		} = await query.graph({
			entity: 'order',
			fields: ['display_id', 'email', 'customer.first_name'],
			filters: { id: orderNote.order_id }
		})

		if (!order?.email) {
			return new StepResponse([] as CreateNotificationDTO[])
		}

		const html = await pretty(
			await render(
				getOrderNoteTemplate({
					customerFirstName: order.customer?.first_name ?? 'Valued Customer',
					orderDisplayId: Number(order.display_id),
					note: orderNote.note,
					storeName: store.name
				})
			)
		)

		return new StepResponse([
			{
				channel: 'email',
				to: order.email,
				content: {
					html,
					subject: `A message about your order #${order.display_id}`
				}
			}
		] as CreateNotificationDTO[])
	}
)

export const orderNoteNotificationWorkflow = createWorkflow(
	'order-note-notification-workflow',
	(id: string) => {
		const notifications = prepareOrderNoteNotificationStep(id)
		sendNotificationsStep(notifications)
		return new WorkflowResponse(void 0)
	}
)
