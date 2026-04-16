import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { PRIVATE_ANALYTICS_MODULE } from '../../../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../../../modules/analytics/service'
import type { AdminUpdateSegmentType } from '../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)

	const {
		data: [segment]
	} = await query.graph(
		{
			entity: 'analytics_segment',
			fields: req.queryConfig.fields,
			filters: { id: req.params.id }
		},
		{ throwIfKeyNotFound: true }
	)

	const members = await privateAnalyticsService.listAnalyticsSegmentMemberships({
		segment_id: req.params.id
	} as any)

	res.json({
		segment,
		member_count: members.length
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateSegmentType>,
	res: MedusaResponse
) => {
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	const segment = await privateAnalyticsService.updateAnalyticsSegments({
		id: req.params.id,
		...req.validatedBody
	})
	res.json({ segment })
}
