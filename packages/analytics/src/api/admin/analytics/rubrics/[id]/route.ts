import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { PRIVATE_ANALYTICS_MODULE } from '../../../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../../../modules/analytics/service'
import type { AdminUpdateRubricType } from '../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const {
		data: [rubric]
	} = await query.graph(
		{
			entity: 'analytics_rubric',
			fields: req.queryConfig.fields,
			filters: { id: req.params.id }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ rubric })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateRubricType>,
	res: MedusaResponse
) => {
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	const rubric = await privateAnalyticsService.updateAnalyticsRubrics({
		id: req.params.id,
		...req.validatedBody
	})
	res.json({ rubric })
}
