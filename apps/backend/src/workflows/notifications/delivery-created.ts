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
import getDeliveryCreatedTemplate from '../../templates/delivery-created'

const prepareDeliveryCreatedNotificationStep = createStep(
	'prepare-delivery-created-notification',
	async (id: string, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY) as RemoteQueryFunction

		const {
			data: [store]
		} = await query.graph({
			entity: 'store',
			fields: ['name']
		})

		const {
			data: [fulfillment]
		} = await query.graph({
			entity: 'fulfillment',
			fields: [
				'id',
				'order.id',
				'items.quantity',
				'items.line_item_id',
				'veeqo_shipment.carrier',
				'veeqo_shipment.tracking_number'
			],
			filters: { id }
		})

		const orderId = (fulfillment as any)?.order?.id as string | undefined
		if (!orderId) {
			return new StepResponse([] as CreateNotificationDTO[])
		}

		const {
			data: [order]
		} = await query.graph({
			entity: 'order',
			fields: [
				'display_id',
				'email',
				'customer.first_name',
				'customer.last_name',
				'shipping_address.first_name',
				'shipping_address.last_name',
				'shipping_address.address_1',
				'shipping_address.address_2',
				'shipping_address.city',
				'shipping_address.province',
				'shipping_address.postal_code',
				'shipping_address.country_code',
				'items.id',
				'items.title',
				'items.thumbnail'
			],
			filters: { id: orderId }
		})

		type AnyRecord = Record<string, any>

		const orderItemMap = Object.fromEntries(
			((order as AnyRecord).items ?? []).map((item: AnyRecord) => [item.id, item])
		)

		const veeqoShipment = (fulfillment as AnyRecord).veeqo_shipment as AnyRecord | undefined
		const carrier = veeqoShipment?.carrier as AnyRecord | undefined
		const trackingNumber = veeqoShipment?.tracking_number as AnyRecord | undefined

		const deliveryItems = ((fulfillment as AnyRecord).items ?? []).map((fItem: AnyRecord) => {
			const orderItem = orderItemMap[fItem.line_item_id] as AnyRecord | undefined
			return {
				title: orderItem?.title ?? '',
				quantity: fItem.quantity as number,
				thumbnail: (orderItem?.thumbnail as string | undefined) ?? undefined
			}
		})

		const html = await pretty(
			await render(
				getDeliveryCreatedTemplate({
					order: {
						display_id: (order as AnyRecord).display_id,
						customer: {
							first_name: (order as AnyRecord).customer?.first_name ?? '',
							last_name: (order as AnyRecord).customer?.last_name ?? ''
						},
						shipping_address: (order as AnyRecord).shipping_address
					},
					delivery: {
						carrier_name: carrier?.name ?? '',
						tracking_number: trackingNumber?.tracking_number ?? '',
						tracking_url: (trackingNumber?.tracking_url as string | null) ?? null,
						items: deliveryItems
					},
					storeName: store.name
				})
			)
		)

		return new StepResponse([
			{
				channel: 'email',
				to: (order as AnyRecord).email,
				content: {
					html,
					subject: 'Your order is out for delivery!'
				}
			}
		] as CreateNotificationDTO[])
	}
)

export const sendDeliveryCreatedNotificationWorkflow = createWorkflow(
	'send-delivery-created-notification',
	(id: string) => {
		const notifications = prepareDeliveryCreatedNotificationStep(id)
		sendNotificationsStep(notifications)
		return new WorkflowResponse(void 0)
	}
)
