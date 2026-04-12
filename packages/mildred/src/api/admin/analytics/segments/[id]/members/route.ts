import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import type { AdminGetSegmentMembersType } from '../../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetSegmentMembersType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { data: members, metadata } = await query.graph({
		entity: 'analytics_segment_membership',
		...req.queryConfig,
		filters: { segment_id: req.params.id }
	})

	res.json({
		members,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}
