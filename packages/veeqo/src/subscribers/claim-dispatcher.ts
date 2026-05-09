import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { syncReplacementToVeeqoWorkflow } from '../workflows/order'
import { SourceType } from '../modules/veeqo/models/veeqo-order'

export const config: SubscriberConfig = {
	event: 'order.claim_created'
}

export default async function claimDispatchHandler({
	event: {
		data: { order_id, claim_id }
	},
	container
}: SubscriberArgs<{ order_id: string; claim_id: string }>) {
	await syncReplacementToVeeqoWorkflow(container).run({
		input: {
			orderId: order_id,
			sourceType: SourceType.CLAIM,
			sourceId: claim_id
		}
	})
}
