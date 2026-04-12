import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { syncOrderToVeeqoWorkflow } from '../workflows/veeqo/order'

export const config: SubscriberConfig = {
	event: 'order.placed'
}

export default async function veeqoDispatchHandler({
	event: {
		data: { id: orderId }
	},
	container
}: SubscriberArgs<{ id: string }>) {
	await syncOrderToVeeqoWorkflow(container).run({ input: orderId })
}
