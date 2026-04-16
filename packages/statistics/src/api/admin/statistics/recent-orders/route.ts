import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetRecentOrdersType } from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetRecentOrdersType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { limit } = req.validatedQuery as AdminGetRecentOrdersType

	const { data: orders } = await query.graph({
		entity: 'order',
		fields: [
			'id', 'display_id', 'status', 'email', 'total', 'created_at',
			'customer.first_name', 'customer.last_name'
		],
		pagination: { take: limit, order: { created_at: 'DESC' } }
	})

	res.json({ orders })
}
