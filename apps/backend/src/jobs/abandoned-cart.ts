import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { sendAbandonedCartsWorkflow } from '../workflows/notifications/abandoned-cart'

export default async function abandonedCartJob(container: MedusaContainer) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const query = container.resolve(ContainerRegistrationKeys.QUERY)

	const now = new Date()

	const fiveHoursAgo = new Date(now)
	fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5)

	const twentyNineHoursAgo = new Date(now)
	twentyNineHoursAgo.setHours(twentyNineHoursAgo.getHours() - 29)

	const limit = 100
	let offset = 0
	let totalCount = 0
	let notifiedCount = 0

	do {
		const { data: carts, metadata } = await query.graph({
			entity: 'cart',
			fields: [
				'id',
				'email',
				'metadata',
				'customer.first_name',
				'customer.last_name',
				'shipping_address.first_name',
				'shipping_address.last_name',
				'items.title',
				'items.quantity',
				'items.unit_price',
				'items.thumbnail'
			],
			filters: {
				updated_at: {
					$gt: twentyNineHoursAgo,
					$lt: fiveHoursAgo
				},
				email: {
					$ne: null
				},
				completed_at: null
			},
			pagination: {
				skip: offset,
				take: limit
			}
		})

		totalCount = metadata?.count ?? 0

		const eligible = carts.filter(
			(cart) =>
				(cart.items?.length ?? 0) > 0 &&
				!cart.metadata?.abandoned_notification
		)

		if (eligible.length > 0) {
			try {
				await sendAbandonedCartsWorkflow(container).run({
					input: { carts: eligible as any }
				})
				notifiedCount += eligible.length
			} catch (error) {
				logger.error(`Failed to send abandoned cart notifications: ${(error as Error).message}`)
			}
		}

		offset += limit
	} while (offset < totalCount)

	logger.info(`Sent ${notifiedCount} abandoned cart notifications`)
}

export const config = {
	name: 'abandoned-cart-notifications',
	schedule: '0 6 * * *'
}
