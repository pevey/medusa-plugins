import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { VeeqoService } from '../modules/veeqo/service'

import { syncVeeqoOrderShipmentsWorkflow } from '../workflows/veeqo/shipments'

export default async function veeqoOrderSyncJob(container: MedusaContainer) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const veeqoService: VeeqoService = container.resolve('veeqo')

	const limit = 50
	let offset = 0
	let totalCount = 0

	do {
		const [orders, count] = await veeqoService.listAndCountVeeqoOrders(
			{ status: 'open' },
			{ take: limit, skip: offset }
		)
		totalCount = count

		for (const order of orders as any[]) {
			try {
				await syncVeeqoOrderShipmentsWorkflow(container).run({
					input: { veeqoOrderDbId: order.id as string }
				})
			} catch (err) {
				logger.error(
					`veeqo-order-sync: failed for VeeqoOrder ${order.id}: ${(err as Error).message}`
				)
			}
		}

		offset += limit
	} while (offset < totalCount)

	logger.info(`veeqo-order-sync: processed ${totalCount} open orders`)
}

export const config = {
	name: 'veeqo-order-sync',
	schedule: '15 */4 * * *' // Every 4 hours at minute 15
}
