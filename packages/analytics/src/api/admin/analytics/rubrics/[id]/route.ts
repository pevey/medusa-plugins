import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { PRIVATE_ANALYTICS_MODULE } from '../../../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../../../modules/analytics/service'
import type { AdminUpdateRubricType } from '../../../../validators'
import { invalidateRubricCache } from '../../../../../lib/rubric-gate'

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

export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateRubricType>, res: MedusaResponse) => {
	const privateAnalyticsService: PrivateAnalyticsService = req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	await privateAnalyticsService.updateAnalyticsRubrics({
		id: req.params.id,
		...req.validatedBody
	})
	invalidateRubricCache()

	// `updateAnalyticsRubrics` returns the raw ORM entity (including `deleted_at`),
	// not the field-selected shape the GET route returns. Re-fetch through the same
	// graph query the detail route uses so the response matches AdminRubric exactly.
	const {
		data: [rubric]
	} = await query.graph({
		entity: 'analytics_rubric',
		fields: ['id', 'name', 'label', 'description', 'expected_properties', 'active', 'created_at', 'updated_at'],
		filters: { id: req.params.id }
	})

	res.json({ rubric })
}
