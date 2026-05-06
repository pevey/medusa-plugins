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
import getOrderPlacedTemplate from '../../templates/order-placed'

const prepareOrderPlacedNotificationStep = createStep(
	'prepare-order-placed-notification',
	async (id: string, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY) as RemoteQueryFunction

		const {
			data: [order]
		} = await query.graph({
			entity: 'order',
			fields: [
				'display_id',
				'created_at',
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
				'billing_address.first_name',
				'billing_address.last_name',
				'billing_address.address_1',
				'billing_address.address_2',
				'billing_address.city',
				'billing_address.province',
				'billing_address.postal_code',
				'billing_address.country_code',
				'items.id',
				'items.title',
				'items.thumbnail',
				'items.unit_price',
				'items.quantity',
				'subtotal',
				'shipping_total',
				'discount_total',
				'tax_total',
				'total'
			],
			filters: { id }
		})

		type AnyRecord = Record<string, any>
		const o = order as AnyRecord

		const html = await pretty(
			await render(
				getOrderPlacedTemplate({
					order: {
						display_id: o.display_id,
						created_at: o.created_at,
						email: o.email,
						customer: {
							first_name: o.customer?.first_name ?? '',
							last_name: o.customer?.last_name ?? ''
						},
						shipping_address: o.shipping_address,
						billing_address: o.billing_address?.address_1 ? o.billing_address : undefined,
						items: (o.items ?? []).map((item: AnyRecord) => ({
							title: item.title ?? '',
							quantity: item.quantity,
							unit_price: item.unit_price,
							thumbnail: item.thumbnail ?? undefined
						})),
						subtotal: o.subtotal,
						shipping_total: o.shipping_total,
						discount_total: o.discount_total ?? 0,
						tax_total: o.tax_total,
						total: o.total
					},
					storeName: 'Demo Store'
				})
			)
		)

		return new StepResponse([
			{
				channel: 'email',
				to: o.email,
				content: {
					html,
					subject: `Order Confirmation #${o.display_id}`
				}
			}
		] as CreateNotificationDTO[])
	}
)

export const sendOrderPlacedNotificationWorkflow = createWorkflow(
	'send-order-placed-notification',
	(id: string) => {
		const notifications = prepareOrderPlacedNotificationStep(id)
		sendNotificationsStep(notifications)
		return new WorkflowResponse(void 0)
	}
)
