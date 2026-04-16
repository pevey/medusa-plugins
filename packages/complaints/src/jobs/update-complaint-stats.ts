// src/jobs/update-complaint-stats.ts
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../modules/complaint'
import { ComplaintService } from '../modules/complaint/service'

export default async function updateComplaintStatsJob(container: MedusaContainer) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const complaintService: ComplaintService = container.resolve(COMPLAINT_MODULE)
	const query = container.resolve(ContainerRegistrationKeys.QUERY)

	try {
		const limit = 100
		let offset = 0
		let totalCount = 0
		const orderCountsByProduct: Record<string, number> = {}

		do {
			const { data: orders, metadata } = await query.graph({
				entity: 'order',
				fields: ['id', 'items.*'],
				pagination: {
					take: limit,
					skip: offset
				}
			})

			totalCount = metadata?.count || 0
			offset += limit

			for (const order of orders) {
				const productsInThisOrder = new Set<string>()

				for (const item of order.items || []) {
					if (!item?.product_id) continue
					productsInThisOrder.add(item.product_id)
				}

				for (const productId of productsInThisOrder) {
					orderCountsByProduct[productId] = (orderCountsByProduct[productId] || 0) + 1
				}
			}
		} while (offset < totalCount)

		await complaintService.calculateComplaintRates(orderCountsByProduct)

		logger.info('Complaint product statistics updated.')
	} catch (error: any) {
		logger.error(`Failed to update complaint stats: ${error.message}`)
	}
}

export const config = {
	name: 'daily-complaint-stats',
	schedule: '0 0 * * *'
}
