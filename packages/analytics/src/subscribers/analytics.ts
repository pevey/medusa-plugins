import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { trackEventWorkflow } from '../workflows/analytics/track-event'
import { identifyActorWorkflow } from '../workflows/analytics/identify-actor'

export const config: SubscriberConfig = {
	event: [
		'order.placed',
		'order.canceled',
		'order.completed',
		'order.shipment_created',
		'order.transfer_requested',
		'cart.created',
		'cart.updated',
		'cart.customer_transferred',
		'customer.created',
		'customer.updated',
		'return.requested',
		'return.received'
	]
}

export default async function analyticsHandler({
	event: {
		data: { id },
		name
	},
	container
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger')
	const query = container.resolve(ContainerRegistrationKeys.QUERY)

	try {
		switch (name) {
			// ── Orders ──────────────────────────────────────────────────────
			case 'order.placed': {
				const { data: [order] } = await query.graph({
					entity: 'order',
					fields: ['id', 'customer.id', 'cart_id', 'sales_channel_id', 'items.variant_id', 'items.product_id', 'items.quantity', 'total'],
					filters: { id }
				})
				const salesChannelId = (order as any).sales_channel_id
				await trackEventWorkflow(container).run({
					input: {
						event: 'order_placed',
						actor_id: order.customer?.id,
						sales_channel_id: salesChannelId,
						properties: {
							order_id: order.id,
							total: order.total,
							item_count: order.items?.length,
							items: order.items?.map((item: any) => ({
								variant_id: item?.variant_id,
								product_id: item?.product_id,
								quantity: item?.quantity
							}))
						}
					}
				})
				// Identity stitching: cart_id → customer_id
				if (order.customer?.id && (order as any).cart_id) {
					await identifyActorWorkflow(container).run({
						input: {
							actor_id: order.customer.id,
							anonymous_id: (order as any).cart_id,
							customer_id: order.customer.id
						}
					})
				}
				break
			}
			case 'order.canceled': {
				const { data: [order] } = await query.graph({
					entity: 'order',
					fields: ['id', 'customer.id', 'total', 'sales_channel_id'],
					filters: { id }
				})
				await trackEventWorkflow(container).run({
					input: {
						event: 'order_canceled',
						actor_id: order.customer?.id,
						sales_channel_id: (order as any).sales_channel_id,
						properties: { order_id: order.id, total: order.total }
					}
				})
				break
			}
			case 'order.completed': {
				const { data: [order] } = await query.graph({
					entity: 'order',
					fields: ['id', 'customer.id', 'total', 'sales_channel_id'],
					filters: { id }
				})
				await trackEventWorkflow(container).run({
					input: {
						event: 'order_completed',
						actor_id: order.customer?.id,
						sales_channel_id: (order as any).sales_channel_id,
						properties: { order_id: order.id, total: order.total }
					}
				})
				break
			}
			case 'order.shipment_created': {
				const { data: [order] } = await query.graph({
					entity: 'order',
					fields: ['id', 'customer.id', 'sales_channel_id'],
					filters: { id }
				})
				await trackEventWorkflow(container).run({
					input: {
						event: 'shipment_created',
						actor_id: order.customer?.id,
						sales_channel_id: (order as any).sales_channel_id,
						properties: { order_id: order.id }
					}
				})
				break
			}
			case 'order.transfer_requested': {
				const { data: [order] } = await query.graph({
					entity: 'order',
					fields: ['id', 'customer.id'],
					filters: { id }
				})
				const guestCustomerId = order.customer?.id
				if (guestCustomerId) {
					logger.info(`Analytics: order transfer requested for order ${id}, guest customer ${guestCustomerId}`)
				}
				break
			}

			// ── Carts ───────────────────────────────────────────────────────
			case 'cart.created': {
				const { data: [cart] } = await query.graph({
					entity: 'cart',
					fields: ['id', 'sales_channel_id'],
					filters: { id }
				})
				await trackEventWorkflow(container).run({
					input: {
						event: 'cart_created',
						actor_id: id,
						sales_channel_id: (cart as any)?.sales_channel_id,
						properties: { cart_id: id }
					}
				})
				break
			}
			case 'cart.updated': {
				const { data: [cart] } = await query.graph({
					entity: 'cart',
					fields: ['id', 'sales_channel_id'],
					filters: { id }
				})
				await trackEventWorkflow(container).run({
					input: {
						event: 'cart_updated',
						actor_id: id,
						sales_channel_id: (cart as any)?.sales_channel_id,
						properties: { cart_id: id }
					}
				})
				break
			}
			case 'cart.customer_transferred': {
				const { data: [cart] } = await query.graph({
					entity: 'cart',
					fields: ['id', 'customer.id'],
					filters: { id }
				})
				if (cart.customer?.id) {
					await identifyActorWorkflow(container).run({
						input: {
							actor_id: cart.customer.id,
							anonymous_id: id,
							customer_id: cart.customer.id
						}
					})
				}
				break
			}

			// ── Customers ───────────────────────────────────────────────────
			case 'customer.created': {
				const { data: [customer] } = await query.graph({
					entity: 'customer',
					fields: ['id', 'email', 'first_name', 'last_name'],
					filters: { id }
				})
				await trackEventWorkflow(container).run({
					input: {
						event: 'customer_created',
						actor_id: customer.id,
						properties: { customer_id: customer.id, email: customer.email }
					}
				})
				await identifyActorWorkflow(container).run({
					input: {
						actor_id: customer.id,
						customer_id: customer.id,
						properties: {
							email: customer.email,
							first_name: customer.first_name,
							last_name: customer.last_name
						}
					}
				})
				break
			}
			case 'customer.updated': {
				const { data: [customer] } = await query.graph({
					entity: 'customer',
					fields: ['id', 'email', 'first_name', 'last_name'],
					filters: { id }
				})
				await trackEventWorkflow(container).run({
					input: {
						event: 'customer_updated',
						actor_id: customer.id,
						properties: { customer_id: customer.id }
					}
				})
				await identifyActorWorkflow(container).run({
					input: {
						actor_id: customer.id,
						customer_id: customer.id,
						properties: {
							email: customer.email,
							first_name: customer.first_name,
							last_name: customer.last_name
						}
					}
				})
				break
			}

			// ── Returns ─────────────────────────────────────────────────────
			case 'return.requested': {
				await trackEventWorkflow(container).run({
					input: {
						event: 'return_requested',
						properties: { return_id: id }
					}
				})
				break
			}
			case 'return.received': {
				await trackEventWorkflow(container).run({
					input: {
						event: 'return_received',
						properties: { return_id: id }
					}
				})
				break
			}

			default:
				break
		}
	} catch (error) {
		logger.error(`Analytics subscriber failed for ${name}: ${(error as Error).message}`)
	}
}
