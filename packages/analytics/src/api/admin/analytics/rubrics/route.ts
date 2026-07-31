import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { PRIVATE_ANALYTICS_MODULE } from '../../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../../modules/analytics/service'
import type { AdminGetRubricsType, AdminCreateRubricType, AdminDeleteRubricsType } from '../../../validators'
import { invalidateRubricCache } from '../../../../lib/rubric-gate'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetRubricsType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { q, active } = req.validatedQuery

	const filters: Record<string, unknown> = {}
	if (active !== undefined) filters.active = active
	if (q) filters.name = { $ilike: `%${q}%` }

	const { data: rubrics, metadata } = await query.graph({
		entity: 'analytics_rubric',
		...req.queryConfig,
		filters
	})

	res.json({
		rubrics,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateRubricType>, res: MedusaResponse) => {
	const privateAnalyticsService: PrivateAnalyticsService = req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const created = await privateAnalyticsService.createAnalyticsRubrics(req.validatedBody)
	invalidateRubricCache()

	// `createAnalyticsRubrics` returns the raw ORM entity (including `deleted_at`),
	// not the field-selected shape the GET routes return. Re-fetch through the same
	// graph query the detail route uses so the response matches AdminRubric exactly.
	const {
		data: [rubric]
	} = await query.graph({
		entity: 'analytics_rubric',
		fields: ['id', 'name', 'label', 'description', 'expected_properties', 'active', 'created_at', 'updated_at'],
		filters: { id: created.id }
	})

	res.json({ rubric })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteRubricsType>, res: MedusaResponse) => {
	const privateAnalyticsService: PrivateAnalyticsService = req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	await privateAnalyticsService.deleteAnalyticsRubrics(req.validatedBody.ids)
	invalidateRubricCache()
	res.json({ deleted: req.validatedBody.ids })
}
