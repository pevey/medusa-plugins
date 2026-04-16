import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { PRIVATE_ANALYTICS_MODULE } from '../../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../../modules/analytics/service'
import type {
	AdminGetSegmentsType,
	AdminCreateSegmentType,
	AdminDeleteSegmentsType
} from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetSegmentsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { data: segments, metadata } = await query.graph({
		entity: 'analytics_segment',
		...req.queryConfig
	})

	res.json({
		segments,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateSegmentType>,
	res: MedusaResponse
) => {
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	const segment = await privateAnalyticsService.createAnalyticsSegments({
		...req.validatedBody,
		created_by: req.auth_context.actor_id
	})
	res.json({ segment })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteSegmentsType>,
	res: MedusaResponse
) => {
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	await privateAnalyticsService.deleteAnalyticsSegments(req.validatedBody.ids)
	res.json({ deleted: req.validatedBody.ids })
}
