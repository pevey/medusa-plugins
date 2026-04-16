import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { PRIVATE_ANALYTICS_MODULE } from '../../../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../../../modules/analytics/service'
import type { AdminUpdateFunnelType } from '../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const {
		data: [funnel]
	} = await query.graph(
		{
			entity: 'analytics_funnel',
			fields: req.queryConfig.fields,
			filters: { id: req.params.id }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ funnel })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateFunnelType>,
	res: MedusaResponse
) => {
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	const { steps, ...rest } = req.validatedBody
	const funnel = await privateAnalyticsService.updateAnalyticsFunnels({
		id: req.params.id,
		...rest,
		...(steps !== undefined ? { steps: steps as unknown as Record<string, unknown> } : {})
	})
	res.json({ funnel })
}
