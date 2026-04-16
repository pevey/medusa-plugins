import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../../modules/complaint'
import { ComplaintService } from '../../../../modules/complaint/service'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

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

	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	await complaintService.calculateComplaintRates(orderCountsByProduct)
	res.json({ success: true })
}
