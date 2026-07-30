import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StoreGetMyReviewsType } from '../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<StoreGetMyReviewsType>, res: MedusaResponse) => {
	const customerId = req.auth_context.actor_id
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const {
		status,
		product_id,
		limit = 20,
		offset = 0,
		order
	} = req.validatedQuery as StoreGetMyReviewsType & {
		limit?: number
		offset?: number
		order?: string
	}
	const { data, metadata } = await query.graph({
		entity: 'review',
		fields: req.queryConfig.fields,
		filters: {
			customer_id: customerId,
			...(status ? { status } : {}),
			...(product_id ? { product_id } : {})
		},
		pagination: {
			skip: offset,
			take: limit,
			order: order ? { [order.replace(/^-/, '')]: order.startsWith('-') ? 'DESC' : 'ASC' } : { created_at: 'DESC' }
		}
	})
	res.json({ reviews: data, count: metadata?.count ?? data.length, limit, offset })
}
