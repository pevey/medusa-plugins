import { randomUUID } from 'crypto'
import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { TRACING_MODULE } from '../modules/tracing'
import { TracingService } from '../modules/tracing/service'

type FulfillmentCreatedData = {
	order_id: string
	fulfillment_id: string
}

export default async function fulfillmentCreatedHandler({
	event: { data },
	container,
}: SubscriberArgs<FulfillmentCreatedData>) {
	const tracingService: TracingService = container.resolve(TRACING_MODULE)
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const query = container.resolve(ContainerRegistrationKeys.QUERY)

	const { data: fulfillments } = await query.graph({
		entity: 'fulfillment',
		fields: ['id', 'location_id', 'items.*'],
		filters: { id: data.fulfillment_id }
	})

	const fulfillment = fulfillments[0]
	if (!fulfillment) {
		logger.warn(`tracing: fulfillment ${data.fulfillment_id} not found — skipping stock lot tracking`)
		return
	}

	const managedItems = fulfillment.items.filter((item: any) => !!item.inventory_item_id)
	if (!managedItems.length) return

	const orderId = data.order_id

	for (const item of managedItems) {
		try {
			const lot = await tracingService.findFirstAvailable(
				item.inventory_item_id!,
				fulfillment.location_id
			)

			if (!lot) {
				logger.warn(
					`tracing: no stock lot available for inventory item ${item.inventory_item_id} ` +
					`at location ${fulfillment.location_id} — skipping lot tracking for fulfillment ${fulfillment.id}`
				)
				continue
			}

			await tracingService.adjustLotQuantity(lot.id, -item.quantity)

			if (orderId) {
				await Promise.all(
					Array.from({ length: item.quantity }, () =>
						tracingService.createSerialNumbers({
							order_id: orderId,
							value: randomUUID(),
							stock_lot_id: lot.id
						} as any)
					)
				)
			}
		} catch (error) {
			logger.error(
				`tracing: failed to process stock lot for inventory item ${item.inventory_item_id} ` +
				`in fulfillment ${fulfillment.id}: ${(error as Error).message}`
			)
		}
	}
}

export const config: SubscriberConfig = {
	event: 'order.fulfillment_created',
}
