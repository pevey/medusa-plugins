import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const { data: serialNumbers, metadata } = await query.graph({
		entity: 'serial_number',
		...req.queryConfig,
		filters: { stock_lot: { id } }
	})

	res.json({
		serial_numbers: serialNumbers,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}
