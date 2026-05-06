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
import getShipmentCreatedTemplate from '../../templates/shipment-created'

const prepareShipmentCreatedNotificationStep = createStep(
	'prepare-shipment-created-notification',
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
				'labels.tracking_number',
				'labels.tracking_url',
				'items.quantity',
				'items.line_item_id',
				'veeqo_shipment.tracking_number',
				'veeqo_shipment.carrier'
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

		const label = ((fulfillment as AnyRecord).labels ?? [])[0] as
			| AnyRecord
			| undefined
		const veeqoShipment = (fulfillment as AnyRecord).veeqo_shipment as AnyRecord | undefined
		const veeqoTrackingNumber = veeqoShipment?.tracking_number as AnyRecord | undefined

		const shipmentItems = ((fulfillment as AnyRecord).items ?? []).map((fItem: AnyRecord) => {
			const orderItem = orderItemMap[fItem.line_item_id] as AnyRecord | undefined
			return {
				title: orderItem?.title ?? '',
				quantity: fItem.quantity as number,
				thumbnail: (orderItem?.thumbnail as string | undefined) ?? undefined
			}
		})

		const html = await pretty(
			await render(
				getShipmentCreatedTemplate({
					order: {
						display_id: (order as AnyRecord).display_id,
						customer: {
							first_name: (order as AnyRecord).customer?.first_name ?? '',
							last_name: (order as AnyRecord).customer?.last_name ?? ''
						},
						shipping_address: (order as AnyRecord).shipping_address
					},
					shipment: {
						tracking_number: veeqoTrackingNumber?.tracking_number ?? label?.tracking_number ?? '',
						tracking_url: veeqoTrackingNumber?.tracking_url ?? label?.tracking_url ?? '',
						items: shipmentItems
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
					subject: 'Your order has shipped!'
				}
			}
		] as CreateNotificationDTO[])
	}
)

export const sendShipmentCreatedNotificationWorkflow = createWorkflow(
	'send-shipment-created-notification',
	(id: string) => {
		const notifications = prepareShipmentCreatedNotificationStep(id)
		sendNotificationsStep(notifications)
		return new WorkflowResponse(void 0)
	}
)
