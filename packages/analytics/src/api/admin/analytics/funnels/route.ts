import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { PRIVATE_ANALYTICS_MODULE } from '../../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../../modules/analytics/service'
import type {
	AdminGetFunnelsType,
	AdminCreateFunnelType,
	AdminDeleteFunnelsType
} from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetFunnelsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { data: funnels, metadata } = await query.graph({
		entity: 'analytics_funnel',
		...req.queryConfig
	})

	res.json({
		funnels,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateFunnelType>,
	res: MedusaResponse
) => {
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	const { steps, ...rest } = req.validatedBody
	const funnel = await privateAnalyticsService.createAnalyticsFunnels({
		...rest,
		steps: steps as unknown as Record<string, unknown>
	})
	res.json({ funnel })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteFunnelsType>,
	res: MedusaResponse
) => {
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	await privateAnalyticsService.deleteAnalyticsFunnels(req.validatedBody.ids)
	res.json({ deleted: req.validatedBody.ids })
}
