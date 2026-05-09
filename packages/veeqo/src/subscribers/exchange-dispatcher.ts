import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { syncReplacementToVeeqoWorkflow } from '../workflows/order'
import { SourceType } from '../modules/veeqo/models/veeqo-order'

export const config: SubscriberConfig = {
	event: 'order.exchange_created'
}

export default async function exchangeDispatchHandler({
	event: {
		data: { order_id, exchange_id }
	},
	container
}: SubscriberArgs<{ order_id: string; exchange_id: string }>) {
	await syncReplacementToVeeqoWorkflow(container).run({
		input: {
			orderId: order_id,
			sourceType: SourceType.EXCHANGE,
			sourceId: exchange_id
		}
	})
}
